#ifndef EMSCRIPTEN_KEEPALIVE
#define EMSCRIPTEN_KEEPALIVE
#endif

#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <emscripten/em_asm.h>
#include <cmath>
#include <fstream>
#include <memory>
#include <new>
#include <numeric>
#include <string>
#include <vector>
#include <algorithm>
#include <iostream>
#include <future>
#include <stdexcept>


#include "hnswlib/hnswlib.h"



void normalizePoint(std::vector<float>& vec) {
  const size_t dim = vec.size();
  const float norm = std::sqrt(std::fabs(std::inner_product(vec.begin(), vec.end(), vec.begin(), 0.0f)));
  if (norm > 0.0f) {
    for (size_t i = 0; i < dim; i++) vec[i] /= norm;
  }
}


/*****************/
class L2Space {
public:
  uint32_t dim_;
  std::unique_ptr<hnswlib::L2Space> l2space_;

  L2Space(uint32_t dim): dim_(dim), l2space_(new hnswlib::L2Space(dim)) {}

  float distance(const std::vector<float>& vec_a, const std::vector<float>& vec_b) {
    hnswlib::DISTFUNC<float> df = l2space_->get_dist_func();
    return df(vec_a.data(), vec_b.data(), l2space_->get_dist_func_param());
  }

  uint32_t getNumDimensions() { return dim_; }
};


/*****************/
class InnerProductSpace {
public:
  uint32_t dim_;
  std::unique_ptr<hnswlib::InnerProductSpace> ipspace_;

  InnerProductSpace(uint32_t dim): dim_(dim) {
    ipspace_ = std::unique_ptr<hnswlib::InnerProductSpace>(new hnswlib::InnerProductSpace(static_cast<size_t>(dim_)));
  }

  float distance(emscripten::val arr_a, emscripten::val arr_b) {
    std::vector<float> vec_a(dim_, 0.0);
    std::vector<float> vec_b(dim_, 0.0);

    for (uint32_t i = 0; i < dim_; i++) {
      vec_a[i] = arr_a[i].as<float>();
      vec_b[i] = arr_b[i].as<float>();
    }

    hnswlib::DISTFUNC<float> df = ipspace_->get_dist_func();
    const float d = df(vec_a.data(), vec_b.data(), ipspace_->get_dist_func_param());
    return d;
  }

  uint32_t getNumDimensions() { return dim_; }
};


/*****************/
class CustomFilterFunctor: public hnswlib::BaseFilterFunctor {
public:
  CustomFilterFunctor(emscripten::val callback): callback_(callback) {}

  bool operator()(hnswlib::labeltype id) {
    bool result = callback_.call<bool>("apply", id);
    return result;
  }

  // Explicitly declare the destructor with the same exception specification as the base class
  ~CustomFilterFunctor() noexcept override = default;

private:
  emscripten::val callback_;
};


/*****************/
class LoadBruteforceSearchIndexWorker {
public:
  LoadBruteforceSearchIndexWorker(const std::string& filename, hnswlib::BruteforceSearch<float>** index,
    hnswlib::SpaceInterface<float>** space)
    : filename_(filename), result_(false), index_(index), space_(space) {}

  bool Execute() {
    try {
      std::ifstream ifs(filename_);
      if (ifs.is_open()) {
        ifs.close();
      }
      else {
        throw std::runtime_error("failed to open file: " + filename_);
      }
      if (*index_) delete* index_;
      *index_ = new hnswlib::BruteforceSearch<float>(*space_, filename_);
      result_ = true;
    }
    catch (const std::exception& e) {
      result_ = false;
    }
    return result_;
  }

private:
  std::string filename_;
  bool result_;
  hnswlib::BruteforceSearch<float>** index_;
  hnswlib::SpaceInterface<float>** space_;
};


/*****************/
class SaveBruteforceSearchIndexWorker {
public:
  SaveBruteforceSearchIndexWorker(const std::string& filename, hnswlib::BruteforceSearch<float>** index)
    : filename_(filename), result_(false), index_(index) {}

  bool Execute() {
    try {
      if (*index_ == nullptr) throw std::runtime_error("search index is not constructed.");
      (*index_)->saveIndex(filename_);
      result_ = true;
    }
    catch (const std::exception& e) {
      result_ = false;
    }
    return result_;
  }

private:
  std::string filename_;
  bool result_;
  hnswlib::BruteforceSearch<float>** index_;
};

class BruteforceSearch {
public:
  uint32_t dim_;
  hnswlib::BruteforceSearch<float>* index_;
  hnswlib::SpaceInterface<float>* space_;
  bool normalize_;

  BruteforceSearch(const std::string& space_name, uint32_t dim)
    : index_(nullptr), space_(nullptr), normalize_(false), dim_(dim) {

    if (space_name == "l2") {
      space_ = new hnswlib::L2Space(static_cast<size_t>(dim_));
    }
    else if (space_name == "ip") {
      space_ = new hnswlib::InnerProductSpace(static_cast<size_t>(dim_));
    }
    else {
      space_ = new hnswlib::InnerProductSpace(static_cast<size_t>(dim_));
      normalize_ = true;
    }
  }

  ~BruteforceSearch() {
    if (space_) delete space_;
    if (index_) delete index_;
  }

  void initIndex(uint32_t max_elements) {
    if (index_) delete index_;
    index_ = new hnswlib::BruteforceSearch<float>(space_, static_cast<size_t>(max_elements));
  }

  void readIndex(const std::string& filename) {
    if (index_) delete index_;
    index_ = new hnswlib::BruteforceSearch<float>(space_, filename);
  }

  void writeIndex(const std::string& filename) {
    if (index_) {
      index_->saveIndex(filename);
    }
  }

  void addPoint(const std::vector<float>& vec, uint32_t idx) {
    if (normalize_) {
      std::vector<float> normalized_vec = vec;
      // Normalize the vector (omitted for brevity)
      index_->addPoint(reinterpret_cast<void*>(normalized_vec.data()), static_cast<hnswlib::labeltype>(idx));
    }
    else {
      index_->addPoint(reinterpret_cast<void*>(const_cast<float*>(vec.data())), static_cast<hnswlib::labeltype>(idx));
    }
  }

  void removePoint(uint32_t idx) {
    index_->removePoint(static_cast<hnswlib::labeltype>(idx));
  }

  emscripten::val searchKnn(const std::vector<float>& query_vec, uint32_t k, emscripten::val js_filterFn = emscripten::val::undefined()) {
    {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (query_vec.size() != dim_) {
        throw std::runtime_error("Invalid the given array length (expected " + std::to_string(dim_) + ", but got " +
          std::to_string(query_vec.size()) + ").");
      }

      if (k > index_->maxelements_) {
        throw std::runtime_error("Invalid the number of k-nearest neighbors (cannot be given a value greater than `maxElements`: " +
          std::to_string(index_->maxelements_) + ").");
      }
      if (k <= 0) {
        throw std::runtime_error("Invalid the number of k-nearest neighbors (must be a positive number).");
      }

      std::vector<float> vec(dim_, 0.0);
      std::copy(query_vec.begin(), query_vec.end(), vec.begin());

      if (normalize_) normalizePoint(vec);

      hnswlib::BaseFilterFunctor* filterFn = nullptr;
      if (!js_filterFn.isUndefined()) {
        filterFn = new CustomFilterFunctor(js_filterFn);
      }

      std::priority_queue<std::pair<float, size_t>> knn =
        index_->searchKnn(reinterpret_cast<void*>(vec.data()), static_cast<size_t>(k), filterFn);
      const size_t n_results = knn.size();
      emscripten::val arr_distances = emscripten::val::array();
      emscripten::val arr_neighbors = emscripten::val::array();
      for (int32_t i = static_cast<int32_t>(n_results) - 1; i >= 0; i--) {
        const std::pair<float, size_t>& nn = knn.top();
        arr_distances.set(i, nn.first);
        arr_neighbors.set(i, nn.second);
        knn.pop();
      }

      if (filterFn) {
        delete filterFn;
      }

      emscripten::val results = emscripten::val::object();
      results.set("distances", arr_distances);
      results.set("neighbors", arr_neighbors);
      return results;
    }
  }

  uint32_t getMaxElements() {
    if (index_ == nullptr) return 0;
    return index_->maxelements_;
  }

  uint32_t getCurrentCount() {
    if (index_ == nullptr) return 0;
    return index_->cur_element_count;
  }

  uint32_t getNumDimensions() {
    return dim_;
  }
};


/*****************/
class LoadHierarchicalNSWIndexWorker {
public:
  LoadHierarchicalNSWIndexWorker(const std::string& filename, const bool allow_replace_deleted,
    hnswlib::HierarchicalNSW<float>** index, hnswlib::SpaceInterface<float>** space)
    : filename_(filename), allow_replace_deleted_(allow_replace_deleted), index_(index), space_(space) {}

  ~LoadHierarchicalNSWIndexWorker() {}

  bool execute() {
    std::future<bool> result = std::async(std::launch::async, [&]() {
      try {
        std::ifstream ifs(filename_);
        if (ifs.is_open()) {
          ifs.close();
        }
        else {
          throw std::runtime_error("failed to open file: " + filename_);
        }
        if (*index_) delete* index_;
        *index_ = new hnswlib::HierarchicalNSW<float>(*space_, filename_, false, 0, allow_replace_deleted_);
        return true;
      }
      catch (const std::exception& e) {
        return false;
      }
      });
    return result.get();
  }

private:
  std::string filename_;
  bool allow_replace_deleted_;
  hnswlib::HierarchicalNSW<float>** index_;
  hnswlib::SpaceInterface<float>** space_;
};


/*****************/

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <emscripten/em_asm.h>

class AsyncWorkerBase {
public:
  virtual ~AsyncWorkerBase() {}
  virtual void Execute() = 0;

  void SetCompletionCallback(std::function<void()> callback) { completion_callback_ = callback; }

  void Schedule() { emscripten_async_call(&AsyncWorkerBase::Run, this, 0); }

  static EMSCRIPTEN_KEEPALIVE void Run(void* arg) {
    AsyncWorkerBase* worker = static_cast<AsyncWorkerBase*>(arg);
    worker->Execute();
    if (worker->completion_callback_) {
      worker->completion_callback_();
    }
  }

protected:
  std::function<void()> completion_callback_;
};

class SaveHierarchicalNSWIndexWorker: public AsyncWorkerBase {
public:
  SaveHierarchicalNSWIndexWorker(const std::string& filename, hnswlib::HierarchicalNSW<float>** index)
    : filename_(filename), result_(false), index_(index) {}

  ~SaveHierarchicalNSWIndexWorker() {}

  void Execute() override {
    try {
      if (*index_ == nullptr) throw std::runtime_error("search index is not constructed.");
      (*index_)->saveIndex(filename_);
      result_ = true;
    }
    catch (const std::exception& e) {
      result_ = false;
      error_ = "Hnswlib Error: " + std::string(e.what());
    }
  }

  bool GetResult() const { return result_; }

  std::string GetError() const { return error_; }

private:
  std::string filename_;
  bool result_;
  std::string error_;
  hnswlib::HierarchicalNSW<float>** index_;
};

void save_index_async(const std::string& filename, hnswlib::HierarchicalNSW<float>** index,
  emscripten::val resolve, emscripten::val reject) {
  SaveHierarchicalNSWIndexWorker* worker = new SaveHierarchicalNSWIndexWorker(filename, index);
  auto callback = [worker, resolve, reject]() {
    if (worker->GetError().empty()) {
      resolve(worker->GetResult());
    }
    else {
      reject(worker->GetError());
    }
    delete worker;
  };

  worker->SetCompletionCallback(callback);
  worker->Schedule();
}



/*****************/


EMSCRIPTEN_BINDINGS(hnswlib) {
  using namespace emscripten;

  function("normalizePoint", &normalizePoint);

  emscripten::class_<L2Space>("L2Space")
    .constructor<uint32_t>()
    .function("distance", &L2Space::distance)
    .function("getNumDimensions", &L2Space::getNumDimensions);

  emscripten::class_<InnerProductSpace>("InnerProductSpace")
    .constructor<uint32_t>()
    .function("distance", &InnerProductSpace::distance)
    .function("getNumDimensions", &InnerProductSpace::getNumDimensions);

  emscripten::class_<CustomFilterFunctor>("CustomFilterFunctor")
    .constructor<emscripten::val>()
    .function("op", &CustomFilterFunctor::operator());

  emscripten::class_<LoadBruteforceSearchIndexWorker>("LoadBruteforceSearchIndexWorker")
    .constructor<const std::string&, hnswlib::BruteforceSearch<float>**, hnswlib::SpaceInterface<float>**>()
    .function("execute", &LoadBruteforceSearchIndexWorker::Execute);

  emscripten::class_<SaveBruteforceSearchIndexWorker>("SaveBruteforceSearchIndexWorker")
    .constructor<const std::string&, hnswlib::BruteforceSearch<float>**>()
    .function("execute", &SaveBruteforceSearchIndexWorker::Execute);

  emscripten::class_<BruteforceSearch>("BruteforceSearch")
    .constructor<std::string, uint32_t>()
    .function("initIndex", &BruteforceSearch::initIndex)
    .function("readIndex", &BruteforceSearch::readIndex)
    .function("writeIndex", &BruteforceSearch::writeIndex)
    .function("addPoint", &BruteforceSearch::addPoint)
    .function("removePoint", &BruteforceSearch::removePoint)
    .function("searchKnn", &BruteforceSearch::searchKnn, allow_raw_pointers())
    .function("getMaxElements", &BruteforceSearch::getMaxElements)
    .function("getCurrentCount", &BruteforceSearch::getCurrentCount)
    .function("getNumDimensions", &BruteforceSearch::getNumDimensions);

  class_<LoadHierarchicalNSWIndexWorker>("LoadHierarchicalNSWIndexWorker")
    .constructor<const std::string&, bool, hnswlib::HierarchicalNSW<float>**, hnswlib::SpaceInterface<float>**>()
    .function("execute", &LoadHierarchicalNSWIndexWorker::execute);

  emscripten::function("save_index_async", &save_index_async,
    emscripten::allow_raw_pointers()
  );

  emscripten::class_<SaveHierarchicalNSWIndexWorker>("SaveHierarchicalNSWIndexWorker")
    .constructor<const std::string&, hnswlib::HierarchicalNSW<float>**>()
    .function("execute", &SaveHierarchicalNSWIndexWorker::Execute)
    .function("getResult", &SaveHierarchicalNSWIndexWorker::GetResult)
    .function("getError", &SaveHierarchicalNSWIndexWorker::GetError);



}

