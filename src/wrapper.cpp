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
#include <stdio.h>



#include "hnswlib/hnswlib.h"



namespace emscripten {
  namespace internal {

    template <typename T, typename Allocator>
    struct BindingType<std::vector<T, Allocator>> {
      using ValBinding = BindingType<val>;
      using WireType = ValBinding::WireType;

      static WireType toWireType(const std::vector<T, Allocator>& vec) {
        return ValBinding::toWireType(val::array(vec));
      }

      static std::vector<T, Allocator> fromWireType(WireType value) {
        return vecFromJSArray<T>(ValBinding::fromWireType(value));
      }
    };

    template <typename T>
    struct TypeID<T,
      typename std::enable_if_t<std::is_same<
      typename Canonicalized<T>::type,
      std::vector<typename Canonicalized<T>::type::value_type,
      typename Canonicalized<T>::type::allocator_type>>::value>> {
      static constexpr TYPEID get() { return TypeID<val>::get(); }
    };

    /// @brief This function normalizes the point in place, but cheats and uses the same input parameter vector.  It is set as const due to bindings
    /// @param vec 
    void normalizePoints(const std::vector<float>& vec) {
      try {
        std::vector<float>& result = const_cast<std::vector<float>&>(vec);
        const size_t dim = result.size();
        const float norm = std::sqrt(std::fabs(std::inner_product(result.begin(), result.end(), result.begin(), 0.0f)));
        if (norm > 0.0f) {
          for (size_t i = 0; i < dim; i++) result[i] /= norm;
        }
      }
      catch (const std::exception& e) {
        throw std::runtime_error("Failed to normalize the point, check vector dimensions: " + std::string(e.what()));
      }
    }

  }  // namespace internal

  std::vector<float> normalizePointsPure(const std::vector<float>& vec) {
    try {
      std::vector<float> result(vec);
      const size_t dim = result.size();
      const float norm = std::sqrt(std::fabs(std::inner_product(result.begin(), result.end(), result.begin(), 0.0f)));
      if (norm > 0.0f) {
        for (size_t i = 0; i < dim; i++) result[i] /= norm;
      }
      return result;
    }
    catch (const std::exception& e) {
      throw std::runtime_error("Failed to normalize the point, check vector dimensions: " + std::string(e.what()));
    }
  }

  /*****************/

  extern "C" {
    typedef void (*syncfs_callback)(int);

    void hnswlib_syncfs_internal(bool read, syncfs_callback callback) {
      // printf("Syncing FS 2...\n");
      // FILE* fp = fopen("/tmp/abcdefg.txt", "w");
      // if (fp) {
      //   fprintf(fp, "test\n");
      //   fclose(fp);
      // }
      EM_ASM({
        const read = $0;
        const callback = $1;

        FS.syncfs(read, function(err) {
          if (err) {
            console.error('Error syncing FS:', err);
            dynCall('vi', callback,[-1]);
          }
        else {
          console.log('FS synced successfully');
          dynCall('vi', callback,[0]);
          }
        });
        }, read, callback);
    }

    void hnswlib_syncfs(bool read) {
      hnswlib_syncfs_internal(read, [](int result) {
        // Handle result here, e.g., store it in a global variable.

        });
    }

    /*****************/
    class EmscriptenFileSystemManager {
    public:
      static std::string virtualDirectory;

      static void initializeFileSystem(const std::string& fsType) {
        std::lock_guard<std::mutex> lock(init_mutex_);
        virtualDirectory = "/hnswlib-index";
        const char* virtualDirCStr = virtualDirectory.c_str();
        const char* fsTypeCStr = fsType.c_str();

        if (!initialized_) {
          EM_ASM({
            let type = UTF8ToString($0);
            let directory = UTF8ToString($1);
            let allocatedDir = _malloc(directory.length + 1);
            stringToUTF8(directory, allocatedDir, directory.length + 1);
            let jsAllocatedDir = UTF8ToString(allocatedDir);

            if (type == "IDBFS") {
              FS.mkdir(jsAllocatedDir);
              FS.mount(IDBFS, {}, jsAllocatedDir);
              console.log('EmscriptenFileSystemManager: Mounting IDBFS filesystem...');
            }
            // // FUTURE SUPPORT FOR NODEFS
            // if (type == "NODEFS") {
            //   console.log('wrapper', 'NODEFS');
            //   if (!FS.analyzePath(jsAllocatedDir).exists) {
            //     console.log('wrapper', 'NODEFS2');
            //     FS.mkdir(jsAllocatedDir);
            //   }
            //   console.log('wrapper', 'NODEFS3');
            //   FS.mount(NODEFS, { root: './tmp' }, jsAllocatedDir);
            //   console.log('EmscriptenFileSystemManager: Mounting NODEFS   filesystem...');
            // }
            // else if (type == "WORKERFS") {
            //   FS.mkdir(jsAllocatedDir);
            //   FS.mount(WORKERFS, { hnswlibBlobs }, jsAllocatedDir);
            // }
            else {
               throw new Error('Unsupported filesystem type, only NODEFS, IDBFS: ' + type);
            }

            // // PRINT STATEMENT FOR DEBUGGING
            // var fs = require('fs');
            // fs.writeFileSync('./tmp/foobar.txt', 'yeehaw',{encoding:'utf8',flag : 'w'});

            FS.syncfs(true, function(err) {
              // Error
              if (err) {
                console.error('EmscriptenFileSystemManager: Error syncing FS:', err);
                throw new Error('EmscriptenFileSystemManager: Error syncing FS: ' + err);
              }
              // else {
              //   console.log('EmscriptenFileSystemManager: FS synced successfully');
              // }
            });
            _free(allocatedDir);
            }, fsTypeCStr, virtualDirCStr);

          initialized_ = true;

          // // PRINT STATEMENT FOR DBUGGING
          // printf("Syncing FS 1...\n");
          // FILE* fp = fopen("/hnswlib/abcdefg.txt", "w");
          // if (fp) {
          //   fprintf(fp, "test\n");
          //   fclose(fp);
          // }
        }
      }

      static void syncFs(bool read, emscripten::val js_callback) {
        hnswlib_syncfs(read);
        js_callback.call<void>("call", emscripten::val::undefined());
      }

      static bool isInitialized() {
        std::lock_guard<std::mutex> lock(init_mutex_);
        return initialized_;
      }

    private:
      static std::mutex init_mutex_;
      static bool initialized_;
    };


  }



  // Initialize static members
  std::mutex EmscriptenFileSystemManager::init_mutex_;
  bool EmscriptenFileSystemManager::initialized_ = false;
  std::string EmscriptenFileSystemManager::virtualDirectory = "/hnswlib-index";


  /*****************/
  class L2Space {
  public:
    uint32_t dim_;
    std::unique_ptr<hnswlib::L2Space> l2space_;

    L2Space(uint32_t dim) {
      if (!dim) {
        throw std::invalid_argument("Invalid the first argument type, must be a number.");
      }

      dim_ = dim;
      l2space_ = std::unique_ptr<hnswlib::L2Space>(new hnswlib::L2Space(static_cast<size_t>(dim_)));
    }


    float distance(const std::vector<float>& vec_a, const std::vector<float>& vec_b) {
      if (vec_a.size() != dim_ || vec_b.size() != dim_) {
        throw std::invalid_argument("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_) + ".");
      }
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

    float distance(const std::vector<float>& vec_a, const std::vector<float>& vec_b) {

      if (vec_a.size() != dim_ || vec_b.size() != dim_) {
        throw std::invalid_argument("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_) + ".");
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

    bool operator()(hnswlib::labeltype id) override {
      if (callback_.isUndefined() || callback_.isNull()) {
        throw std::invalid_argument("Invalid callback function for CustomFilterFunctor.");
      }

      try {
        bool result = callback_.call<bool>("call", emscripten::val::undefined(), id);
        return result;
      }
      catch (const std::exception& e) {
        throw std::invalid_argument("Failed to call the callback function: " + std::string(e.what()));
      }
    }

    // Explicitly declare the destructor with the same exception specification as the base class
    ~CustomFilterFunctor() noexcept override = default;

  private:
    emscripten::val callback_;
  };



  /*****************/

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
      else if (space_name == "cosine") {
        space_ = new hnswlib::InnerProductSpace(static_cast<size_t>(dim_));
        normalize_ = true;
      }
      else {
        throw std::invalid_argument("invalid space should be expected l2, ip, or cosine, name: " + space_name);
      }
    }

    ~BruteforceSearch() {
      if (space_) delete space_;
      if (index_) delete index_;
    }

    emscripten::val isIndexInitialized() {
      if (index_ == nullptr) {
        return emscripten::val(false);
      }
      else {
        return emscripten::val(true);
      }
    }

    void initIndex(uint32_t max_elements) {
      if (index_) delete index_;
      index_ = new hnswlib::BruteforceSearch<float>(space_, static_cast<size_t>(max_elements));
    }

    void readIndex(const std::string& filename) {
      if (index_) delete index_;

      try {
        index_ = new hnswlib::BruteforceSearch<float>(space_, filename);
      }
      catch (const std::runtime_error& e) {
        // Check the error message and re-throw a different error if it matches the expected error
        std::string errorMessage(e.what());
        std::string target = "The maximum number of elements has been reached";

        if (errorMessage.find(target) != std::string::npos) {
          throw std::runtime_error("The maximum number of elements in the index has been reached. , please increased the index max_size.  max_size: " + std::to_string(index_->maxelements_));
        }
        else {
          // Re-throw the original error if it's not the one you're looking for
          throw;
        }
      }

    }

    void writeIndex(const std::string& filename) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      index_->saveIndex(filename);
      hnswlib_syncfs(false);

    }

    void addPoint(const std::vector<float>& vec, uint32_t idx) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }
      if (vec.size() != dim_) {
        throw std::invalid_argument("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_) + ".");
      }

      std::vector<float>& mutableVec = const_cast<std::vector<float>&>(vec);
      if (normalize_) {
        internal::normalizePoints(mutableVec);
      }

      if (index_->cur_element_count == index_->maxelements_) {
        throw std::runtime_error("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: " + std::to_string(index_->maxelements_));
      }

      try {
        index_->addPoint(reinterpret_cast<void*>(mutableVec.data()), static_cast<hnswlib::labeltype>(idx));
      }
      catch (const std::exception& e) {
        throw std::runtime_error("Hnswlib Error: " + std::string(e.what()));
      }
    }

    void removePoint(uint32_t idx) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      index_->removePoint(static_cast<hnswlib::labeltype>(idx));
    }

    emscripten::val searchKnn(const std::vector<float>& vec, uint32_t k, emscripten::val js_filterFn = emscripten::val::undefined()) {

      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (vec.size() != dim_) {
        throw std::invalid_argument("Invalid the given array length (expected " + std::to_string(dim_) + ", but got " +
          std::to_string(vec.size()) + ").");
      }

      if (k > index_->maxelements_) {
        throw std::invalid_argument("Invalid the number of k-nearest neighbors (cannot be given a value greater than `maxElements`: " +
          std::to_string(index_->maxelements_) + ").");
      }
      if (k <= 0) {
        throw std::invalid_argument("Invalid the number of k-nearest neighbors (must be a positive number).");
      }

      CustomFilterFunctor* filterFnCpp = nullptr;
      if (!js_filterFn.isNull() && !js_filterFn.isUndefined()) {
        filterFnCpp = new CustomFilterFunctor(js_filterFn);
      }

      std::vector<float>& mutableVec = const_cast<std::vector<float>&>(vec);

      if (normalize_) {
        internal::normalizePoints(mutableVec);
      }

      std::priority_queue<std::pair<float, size_t>> knn =
        index_->searchKnn(reinterpret_cast<void*>(const_cast<float*>(mutableVec.data())), static_cast<size_t>(k), filterFnCpp);
      const size_t n_results = knn.size();
      emscripten::val distances = emscripten::val::array();
      emscripten::val neighbors = emscripten::val::array();

      // Reverse the loop order
      for (int32_t i = static_cast<int32_t>(n_results) - 1; i >= 0; i--) {
        auto nn = knn.top();
        distances.set(i, nn.first);
        neighbors.set(i, nn.second);
        knn.pop();
      }

      if (filterFnCpp) delete filterFnCpp;

      emscripten::val results = emscripten::val::object();
      results.set("distances", distances);
      results.set("neighbors", neighbors);

      return results;
    }

    uint32_t getMaxElements() {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }
      return index_->maxelements_;
    }

    uint32_t getCurrentCount() {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      return index_->cur_element_count;
    }

    uint32_t getNumDimensions() {
      return dim_;
    }
  };


  /*****************/

  class HierarchicalNSW {
  public:
    uint32_t dim_;
    hnswlib::HierarchicalNSW<float>* index_;
    hnswlib::SpaceInterface<float>* space_;
    bool normalize_;

    HierarchicalNSW(const std::string& space_name, uint32_t dim)
      : index_(nullptr), space_(nullptr), normalize_(false), dim_(dim) {
      if (space_name == "l2") {
        space_ = new hnswlib::L2Space(static_cast<size_t>(dim_));
      }
      else if (space_name == "ip") {
        space_ = new hnswlib::InnerProductSpace(static_cast<size_t>(dim_));
      }
      else if (space_name == "cosine") {
        space_ = new hnswlib::InnerProductSpace(static_cast<size_t>(dim_));
        normalize_ = true;
      }
      else {
        throw std::invalid_argument("invalid space should be expected l2, ip, or cosine, name: " + space_name);
      }
    }

    ~HierarchicalNSW() {
      if (space_) delete space_;
      if (index_) delete index_;
    }

    emscripten::val isIndexInitialized() {
      if (index_ == nullptr) {
        return emscripten::val(false);
      }
      else {
        return emscripten::val(true);
      }
    }

    void initIndex(uint32_t max_elements, uint32_t m = 16, uint32_t ef_construction = 200, uint32_t random_seed = 100,
      bool allow_replace_deleted = false) {
      if (index_) delete index_;

      index_ = new hnswlib::HierarchicalNSW<float>(space_, max_elements, m, ef_construction, random_seed, allow_replace_deleted);
    }

    void readIndex(const std::string& filename, bool allow_replace_deleted = false) {
      if (index_) delete index_;

      const std::string path = EmscriptenFileSystemManager::virtualDirectory + "/" + filename;

      try {
        index_ = new hnswlib::HierarchicalNSW<float>(space_, path, false, 0, allow_replace_deleted);
      }
      catch (const std::runtime_error& e) {
        std::string errorMessage(e.what());
        std::string target = "The maximum number of elements has been reached";

        if (errorMessage.find(target) != std::string::npos) {
          throw std::runtime_error("The maximum number of elements in the index has been reached. , please increased the index max_size.  max_size: " + std::to_string(index_->max_elements_));
        }
        else {
          // Re-throw the original error if it's not the one you're looking for
          throw;
        }
      }

    }

    void writeIndex(const std::string& filename) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }
      const std::string path = EmscriptenFileSystemManager::virtualDirectory + "/" + filename;
      index_->saveIndex(path);
      hnswlib_syncfs(false);
    }

    void resizeIndex(uint32_t new_max_elements) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }
      index_->resizeIndex(static_cast<size_t>(new_max_elements));
    }

    val getPoint(uint32_t label) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      try {
        std::vector<float> vec = index_->getDataByLabel<float>(static_cast<size_t>(label));
        val point = val::array();
        for (size_t i = 0; i < vec.size(); i++) point.set(i, vec[i]);
        return point;
      }
      catch (const std::runtime_error& e) {
        throw std::runtime_error("Hnswlib Error: " + std::string(e.what()));
      }
    }

    void addPoint(const std::vector<float>& vec, uint32_t idx, bool replace_deleted = false) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (vec.size() != dim_) {
        throw std::invalid_argument("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_) + ".");
      }

      std::vector<float>& mutableVec = const_cast<std::vector<float>&>(vec);

      if (normalize_) {
        internal::normalizePoints(mutableVec);
      }

      if (index_->cur_element_count == index_->max_elements_) {
        throw std::runtime_error("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: " + std::to_string(index_->max_elements_));
      }

      try {
        index_->addPoint(reinterpret_cast<void*>(mutableVec.data()), static_cast<hnswlib::labeltype>(idx), replace_deleted);
      }
      catch (const std::exception& e) {
        throw std::runtime_error("Hnswlib Error: " + std::string(e.what()));
      }
    }
    void addItems(const std::vector<std::vector<float>>& vec, const std::vector<uint32_t>& idVec, bool replace_deleted = false) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (vec.size() != idVec.size()) {
        throw std::runtime_error("The number of vectors and ids must be the same.");
      }

      if (vec.size() <= 0) {
        throw std::runtime_error("The number of vectors and ids must be greater than 0.");
      }

      if (index_->cur_element_count + idVec.size() > index_->max_elements_) {
        throw std::runtime_error("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: " + std::to_string(index_->max_elements_));
      }

      try {
        for (size_t i = 0; i < vec.size(); ++i) {
          if (vec[i].size() != dim_) {
            throw std::invalid_argument("Invalid vector size at index " + std::to_string(i) + ". Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_) + ".");
          }

          std::vector<float>& mutableVec = const_cast<std::vector<float>&>(vec[i]);

          if (normalize_) {
            internal::normalizePoints(mutableVec);
          }

          index_->addPoint(reinterpret_cast<void*>(mutableVec.data()), static_cast<hnswlib::labeltype>(idVec[i]), replace_deleted);
        }
      }
      catch (const std::exception& e) {
        throw std::runtime_error("Could not addItems " + std::string(e.what()));
      }
    }


    int getMaxElements() {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      return index_->max_elements_;
    }

    std::vector<int> getIdsList() {
      std::vector<int> ids;
      if (index_ == nullptr) return ids;
      for (auto kv : index_->label_lookup_) {
        ids.push_back(kv.first);
      }
      return ids;
    }

    void markDelete(uint32_t idx) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      index_->markDelete(static_cast<hnswlib::labeltype>(idx));
    }


    void markDeleteItems(const std::vector<uint32_t>& labelsVec) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      try {
        for (const hnswlib::labeltype& label : labelsVec) {
          index_->markDelete(static_cast<hnswlib::labeltype>(label));
        }
      }
      catch (const std::exception& e) {
        throw std::runtime_error("Could not markDeleteItems " + std::string(e.what()));
      }
    }


    void unmarkDelete(uint32_t idx) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      index_->unmarkDelete(static_cast<hnswlib::labeltype>(idx));
    }

    emscripten::val searchKnn(const std::vector<float>& vec, uint32_t k, emscripten::val js_filterFn = emscripten::val::undefined()) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (vec.size() != dim_) {
        throw std::invalid_argument("Invalid the given array length (expected " + std::to_string(dim_) + ", but got " +
          std::to_string(vec.size()) + ").");
      }

      if (k > index_->max_elements_) {
        throw std::invalid_argument("Invalid the number of k-nearest neighbors (cannot be given a value greater than `maxElements`: " +
          std::to_string(index_->max_elements_) + ").");
      }
      if (k <= 0) {
        throw std::invalid_argument("Invalid the number of k-nearest neighbors (must be a positive number).");
      }

      CustomFilterFunctor* filterFnCpp = nullptr;
      if (!js_filterFn.isNull() && !js_filterFn.isUndefined()) {
        filterFnCpp = new CustomFilterFunctor(js_filterFn);
      }


      std::vector<float>& mutableVec = const_cast<std::vector<float>&>(vec);
      if (normalize_) {
        internal::normalizePoints(mutableVec);
      }

      std::priority_queue<std::pair<float, size_t>> knn =
        index_->searchKnn(reinterpret_cast<void*>(const_cast<float*>(mutableVec.data())), static_cast<size_t>(k), filterFnCpp);
      const size_t n_results = knn.size();
      emscripten::val distances = emscripten::val::array();
      emscripten::val neighbors = emscripten::val::array();

      // Reverse the loop order
      for (int32_t i = static_cast<int32_t>(n_results) - 1; i >= 0; i--) {
        auto nn = knn.top();
        distances.set(i, nn.first);
        neighbors.set(i, nn.second);
        knn.pop();
      }

      if (filterFnCpp) delete filterFnCpp;

      emscripten::val results = emscripten::val::object();
      results.set("distances", distances);
      results.set("neighbors", neighbors);

      return results;
    }

    uint32_t getCurrentCount() const {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      return index_ == nullptr ? 0 : static_cast<uint32_t>(index_->cur_element_count);
    }

    uint32_t getNumDimensions() const {
      return dim_;
    }

    uint32_t getEfSearch() const {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }
      return index_ == nullptr ? 0 : index_->ef_;
    }

    void setEfSearch(uint32_t ef) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (index_ != nullptr) {
        index_->setEf(static_cast<size_t>(ef));
      }
    }
  };


  /*****************/

  EMSCRIPTEN_BINDINGS(hnswlib) {
    using namespace emscripten;

    function("normalizePoint", &normalizePointsPure);

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


    emscripten::class_<BruteforceSearch>("BruteforceSearch")
      .constructor<std::string, uint32_t>()
      .function("initIndex", &BruteforceSearch::initIndex)
      .function("isIndexInitialized", &BruteforceSearch::isIndexInitialized)
      .function("readIndex", &BruteforceSearch::readIndex)
      .function("writeIndex", &BruteforceSearch::writeIndex)
      .function("addPoint", &BruteforceSearch::addPoint)
      .function("removePoint", &BruteforceSearch::removePoint)
      .function("searchKnn", &BruteforceSearch::searchKnn)
      .function("getMaxElements", &BruteforceSearch::getMaxElements)
      .function("getCurrentCount", &BruteforceSearch::getCurrentCount)
      .function("getNumDimensions", &BruteforceSearch::getNumDimensions);

    emscripten::class_<HierarchicalNSW>("HierarchicalNSW")
      .constructor<const std::string&, uint32_t>()
      .function("initIndex", &HierarchicalNSW::initIndex)
      .function("isIndexInitialized", &HierarchicalNSW::isIndexInitialized)
      .function("readIndex", &HierarchicalNSW::readIndex)
      .function("writeIndex", &HierarchicalNSW::writeIndex)
      .function("resizeIndex", &HierarchicalNSW::resizeIndex)
      .function("getPoint", &HierarchicalNSW::getPoint)
      .function("addPoint", &HierarchicalNSW::addPoint)
      .function("addItems", &HierarchicalNSW::addItems)
      .function("getMaxElements", &HierarchicalNSW::getMaxElements)
      .function("getIdsList", &HierarchicalNSW::getIdsList)
      .function("markDelete", &HierarchicalNSW::markDelete)
      .function("markDeleteItems", &HierarchicalNSW::markDeleteItems)
      .function("unmarkDelete", &HierarchicalNSW::unmarkDelete)
      .function("getCurrentCount", &HierarchicalNSW::getCurrentCount)
      .function("getNumDimensions", &HierarchicalNSW::getNumDimensions)
      .function("getEfSearch", &HierarchicalNSW::getEfSearch)
      .function("setEfSearch", &HierarchicalNSW::setEfSearch)
      .function("searchKnn", &HierarchicalNSW::searchKnn)
      ;

    function("syncFs", &hnswlib_syncfs);

    emscripten::class_<EmscriptenFileSystemManager>("EmscriptenFileSystemManager")
      .constructor<>()
      .class_function("initializeFileSystem", &EmscriptenFileSystemManager::initializeFileSystem, emscripten::allow_raw_pointer<const char*>())
      .class_function("isInitialized", &EmscriptenFileSystemManager::isInitialized)
      .class_function("syncFs", &EmscriptenFileSystemManager::syncFs);
  }

}  // namespace emscripten