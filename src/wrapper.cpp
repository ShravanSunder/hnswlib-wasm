#ifndef EMSCRIPTEN_KEEPALIVE
#define EMSCRIPTEN_KEEPALIVE
#endif

#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <emscripten/em_asm.h>
#include <exception>
#include <cstdio>
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

  /*****************/

  extern "C" {
    EM_JS(void, syncIdb_js, (bool populateFromFS), {
        try {
            FS.syncfs(populateFromFS, function(err) {
                setTimeout(function() {
                    if (err) {
                        console.error('b. jsFS Error: syncing FS:', err);
                        Module.setIdbfsSynced(false);
                    }
                    else {
                        console.log('b. jsFS synced successfully');
                        Module.setIdbfsSynced(true);
                    }
                }, 1); //release event loop first
            });
        }
        catch (err) {
            Module.setIdbfsSynced(false);
        }
      });
  }// extern c

  class EmscriptenFileSystemManager {
  private:
    static std::mutex init_mutex_;
    static std::mutex sync_mutex_;
    static std::unique_lock<std::mutex> sync_lock_;
    static emscripten::val syncCallback_;
    static bool initialized_;
    static bool synced_;
  public:
    static std::string virtualDirectory;
    static bool debugLogs;

    static void setDebugLogs(bool allow) {
      debugLogs = allow;
    }

    static bool checkFileExists(const std::string& path) {
      try {
        std::string location = virtualDirectory + "/" + path;
        bool result = std::filesystem::exists(location); // Declare 'result' variable here
        return result;
      }
      catch (...) {
        return false;
      }
    }

    static bool isInitialized() {
      std::lock_guard<std::mutex> lock(init_mutex_);
      return initialized_;
    }

    static bool isSynced() {
      return synced_;
    }

    static void syncFS(bool populateFromFS, emscripten::val callback) {
      if (EmscriptenFileSystemManager::debugLogs) printf("a. start syncFS...\n");
      if (!isInitialized()) {
        if (EmscriptenFileSystemManager::debugLogs) printf("EmscriptenFileSystemManager must be initialized before calling syncFS\n");
        throw std::runtime_error("EmscriptenFileSystemManager must be initialized before calling syncFS");
      }
      sync_lock_ = std::unique_lock<std::mutex>(sync_mutex_);
      syncCallback_ = callback;
      synced_ = false;
      syncIdb_js(populateFromFS);
    }

    static void setIsSynced(bool synced) {

      if (EmscriptenFileSystemManager::debugLogs) printf("c. IDBFS has synced\n");
      synced_ = synced;
      if (!syncCallback_.isUndefined()) {
        printf("d. Calling sync callback...\n");
        syncCallback_.call<void>("call", emscripten::val::undefined());
        syncCallback_ = emscripten::val::undefined();
      }
      if (sync_lock_.owns_lock()) {
        sync_lock_.unlock();
        if (EmscriptenFileSystemManager::debugLogs) printf("e. IDBFS has synced\n");
      }
    }

    static void initializeFileSystem(const std::string& fsType) {
      std::lock_guard<std::mutex> lock(init_mutex_);
      if (!initialized_) {
        virtualDirectory = "/hnswlib-index";
        const char* virtualDirCStr = virtualDirectory.c_str();
        const char* fsTypeCStr = fsType.c_str();
        EM_ASM({
          let type = UTF8ToString($0);
          let directory = UTF8ToString($1);
          let allocatedDir = _malloc(directory.length + 1);
          stringToUTF8(directory, allocatedDir, directory.length + 1);
          let jsAllocatedDir = UTF8ToString(allocatedDir);
          if (type == "IDBFS") {
            FS.mkdir(jsAllocatedDir);
            FS.mount(IDBFS, {}, jsAllocatedDir);
            console.log('EmscriptenFileSystemManager: Mounting IDBFS filesystem...\n');
          }
          else {
             throw new Error('Unsupported filesystem type, IDBFS is supported: ' + type);
          }
          _free(allocatedDir);
          }, fsTypeCStr, virtualDirCStr);
        initialized_ = true;
        syncFS(true, emscripten::val::undefined());
      }
    }
  };



  /*****************/
  // Initialize static members
  /*****************/

  std::mutex EmscriptenFileSystemManager::init_mutex_;
  std::mutex EmscriptenFileSystemManager::sync_mutex_;
  std::unique_lock<std::mutex> EmscriptenFileSystemManager::sync_lock_;
  emscripten::val EmscriptenFileSystemManager::syncCallback_;
  bool EmscriptenFileSystemManager::initialized_ = false;
  bool EmscriptenFileSystemManager::debugLogs = false;
  bool EmscriptenFileSystemManager::synced_ = false;
  std::string EmscriptenFileSystemManager::virtualDirectory = "/hnswlib-index";

  extern "C" {
    void setIdbfsSynced(bool populateFromFS) {
      EmscriptenFileSystemManager::setIsSynced(populateFromFS);
    }
  }


  /*****************/

  namespace internal {

    template <typename T, typename Allocator>

    /// @brief This is a specialization of the BindingType struct for the std::vector class template with template parameters T and Allocator. It provides a WireType type alias and two static member functions toWireType and fromWireType that convert a std::vector<T, Allocator> object to and from its corresponding WireType representation.
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
        if (EmscriptenFileSystemManager::debugLogs) printf("Failed to normalize the point, check vector dimensions: %s\n", e.what());
        throw std::runtime_error("Failed to normalize the point, check vector dimensions: " + std::string(e.what()));
      }
    }

    void normalizePointsPtrs(float* vec, size_t dim) {
      float sum = 0;
      for (size_t i = 0; i < dim; ++i) {
        sum += vec[i] * vec[i];
      }
      float norm = sqrt(sum);
      for (size_t i = 0; i < dim; ++i) {
        vec[i] /= norm;
      }
    }


  }  // namespace internal

  /*****************/

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
      if (EmscriptenFileSystemManager::debugLogs) printf("Failed to normalize the point, check vector dimensions: %s\n", e.what());
      throw std::runtime_error("Failed to normalize the point, check vector dimensions: " + std::string(e.what()));
    }
  }

  /*****************/
  class L2Space {
  public:
    uint32_t dim_;
    std::unique_ptr<hnswlib::L2Space> l2space_;

    L2Space(uint32_t dim) {
      if (!dim) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Invalid the first argument type, must be a number.\n");
        throw std::invalid_argument("Invalid the first argument type, must be a number.");
      }

      dim_ = dim;
      l2space_ = std::unique_ptr<hnswlib::L2Space>(new hnswlib::L2Space(static_cast<size_t>(dim_)));
    }


    float distance(const std::vector<float>& vec_a, const std::vector<float>& vec_b) {
      if (vec_a.size() != dim_ || vec_b.size() != dim_) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is %d.\n", dim_);
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

    InnerProductSpace(uint32_t dim) : dim_(dim) {
      ipspace_ = std::unique_ptr<hnswlib::InnerProductSpace>(new hnswlib::InnerProductSpace(static_cast<size_t>(dim_)));
    }

    float distance(const std::vector<float>& vec_a, const std::vector<float>& vec_b) {

      if (vec_a.size() != dim_ || vec_b.size() != dim_) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is %d.\n", dim_);
        throw std::invalid_argument("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_));
      }

      hnswlib::DISTFUNC<float> df = ipspace_->get_dist_func();
      const float d = df(vec_a.data(), vec_b.data(), ipspace_->get_dist_func_param());
      return d;
    }

    uint32_t getNumDimensions() { return dim_; }
  };


  /*****************/
  class CustomFilterFunctor : public hnswlib::BaseFilterFunctor {
  public:
    CustomFilterFunctor(emscripten::val callback) : callback_(callback) {}

    bool operator()(hnswlib::labeltype id) override {
      if (callback_.isUndefined() || callback_.isNull()) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Invalid callback function for CustomFilterFunctor.\n");
        throw std::invalid_argument("Invalid callback function for CustomFilterFunctor.");
      }

      try {
        bool result = callback_.call<bool>("call", emscripten::val::undefined(), id);
        return result;
      }
      catch (const std::exception& e) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Failed to call the callback function: %s\n", e.what());
        throw std::invalid_argument("Failed to call the callback function: " + std::string(e.what()));
      }
    }

    // Explicitly declare the destructor with the same exception specification as the base class
    ~CustomFilterFunctor() noexcept = default;

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
        if (EmscriptenFileSystemManager::debugLogs) printf("invalid space should be expected l2, ip, or cosine, name: %s\n", space_name.c_str());
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
          printf("The maximum number of elements in the index has been reached. , please increased the index max_size.  max_size: %zu\n", index_->maxelements_);

          throw std::runtime_error("The maximum number of elements in the index has been reached. , please increased the index max_size.  max_size: " + std::to_string(index_->maxelements_));
        }
        else {
          // Re-throw the original error if it's not the one you're looking for
          throw;
        }
      }
      catch (const std::exception& e) {
        printf("Failed to read the index: %s\n", e.what());
        throw std::runtime_error("Failed to read the index: " + std::string(e.what()));
      }
      catch (...) {
        printf("Failed to read the index.\n");
        throw std::runtime_error("Failed to read the index.");
      }

    }

    void writeIndex(const std::string& filename) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      index_->saveIndex(filename);
      EmscriptenFileSystemManager::syncFS(false, emscripten::val::undefined());
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
        throw std::runtime_error("HNSWLIB ERROR: " + std::string(e.what()));
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


  /***************** *****************/
  /***************** *****************/

  class HierarchicalNSW {
  public:
    uint32_t dim_;
    hnswlib::HierarchicalNSW<float>* index_;
    hnswlib::SpaceInterface<float>* space_;
    /// @brief Lock for mutating the index points: addPoint, addPoints, addItems, markdeleted
    std::mutex mutate_lock_;
    /// @brief Lock for cache
    std::mutex label_cache_lock_;
    /// @brief Cache for used labels populated from index_ by updateUsedLabelsCache()
    bool updateCache_ = false;
    std::vector<uint32_t> usedLabelsCache_;
    /// @brief Cache for deleted labels populated from index_ by updateDeletedLabelsCache()
    std::vector<uint32_t> deletedLabelsCache_;
    bool normalize_;
    std::string autoSaveFilename_ = "";


    HierarchicalNSW(const std::string& space_name, uint32_t dim, const std::string& autoSaveFilename)
      : index_(nullptr), space_(nullptr), normalize_(false), dim_(dim) {
      autoSaveFilename_ = autoSaveFilename;
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
        if (EmscriptenFileSystemManager::debugLogs) printf("invalid space should be expected l2, ip, or cosine, name: %s\n", space_name.c_str());
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


    void initIndex(uint32_t max_elements, uint32_t m = 16, uint32_t ef_construction = 200, uint32_t random_seed = 100) {
      if (index_) delete index_;

      index_ = new hnswlib::HierarchicalNSW<float>(space_, max_elements, m, ef_construction, random_seed, true);
    }

    void readIndex(const std::string& filename, uint32_t max_elements) {
      if (index_) delete index_;

      const std::string path = EmscriptenFileSystemManager::virtualDirectory + "/" + filename;

      try {
        index_ = new hnswlib::HierarchicalNSW<float>(space_, path, false, max_elements, true);

        updateLabelCaches();
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
      if (EmscriptenFileSystemManager::debugLogs) printf("WriteIndex filename: %s\n", filename.c_str());

      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }
      const std::string path = EmscriptenFileSystemManager::virtualDirectory + "/" + filename;
      index_->saveIndex(path);
      EmscriptenFileSystemManager::syncFS(false, emscripten::val::undefined());
    }

    void autoSaveIndex() {
      if (autoSaveFilename_ != "" && EmscriptenFileSystemManager::isInitialized()) {
        if (EmscriptenFileSystemManager::debugLogs) printf("AutoSave filename: %s\n", autoSaveFilename_.c_str());
        writeIndex(autoSaveFilename_);
      }
      else {
        if (EmscriptenFileSystemManager::debugLogs) printf("AutoSave not enabled or not initialized\n");
      }
      updateCache_ = true;
    }

    void resizeIndex(uint32_t new_max_elements) {
      if (index_ == nullptr) {
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }
      index_->resizeIndex(static_cast<size_t>(new_max_elements));
      autoSaveIndex();
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
        throw std::runtime_error("HNSWLIB ERROR: " + std::string(e.what()));
      }
    }

    std::vector<uint32_t> getUsedLabels() {
      std::lock_guard<std::mutex> lock(label_cache_lock_);
      if (updateCache_) {
        updateLabelCaches();
      }
      return usedLabelsCache_;
    }

    std::vector<uint32_t> getDeletedLabels() {
      std::lock_guard<std::mutex> lock(label_cache_lock_);
      if (updateCache_) {
        updateLabelCaches();
      }
      return deletedLabelsCache_;
    }

    /// @brief Update local used and deleted labels cache
    void updateLabelCaches() {
      std::lock_guard<std::mutex> lock(label_cache_lock_);
      std::vector<uint32_t> usedLabels;
      std::vector<uint32_t> deletedLabels;
      std::unordered_map<hnswlib::tableint, hnswlib::labeltype> reverse_label_lookup;
      updateCache_ = false;

      for (const auto& kv : index_->label_lookup_) {
        reverse_label_lookup[kv.second] = kv.first;
        if (index_->deleted_elements.find(kv.second) == index_->deleted_elements.end()) {
          usedLabels.push_back(static_cast<uint32_t>(kv.first));
        }
      }

      for (const auto& element : index_->deleted_elements) {
        auto it = reverse_label_lookup.find(element);
        if (it != reverse_label_lookup.end()) {
          deletedLabels.push_back(static_cast<uint32_t>(it->second));
        }
      }

      usedLabelsCache_ = std::move(usedLabels);
      deletedLabelsCache_ = std::move(deletedLabels);
    }




    /// @brief Create labels based on the current used labels and labels marked deleted
    /// @param size input array size
    /// @param replace_deleted true if we want to reuse deleted labels
    /// @return 
    std::vector<uint32_t> generateLabels(size_t size, bool replace_deleted) {
      std::vector<uint32_t> labels;

      {
        std::lock_guard<std::mutex> guard1(index_->label_lookup_lock);
        std::lock_guard<std::mutex> guard2(index_->deleted_elements_lock);

        // Determine the current maxLabel, its incremented later before use
        int64_t maxLabel = -1;
        for (const auto& pair : index_->label_lookup_) {
          if (pair.first > maxLabel) {
            maxLabel = pair.first;
          }
        }

        if (replace_deleted) {
          // Fill with deleted labels first
          for (const auto& pair : index_->label_lookup_) {
            if (index_->deleted_elements.find(pair.second) != index_->deleted_elements.end()) {
              labels.push_back(static_cast<uint32_t>(pair.first));
              if (labels.size() == size) {
                return labels;
              }
            }
          }
        }

        // If not enough deleted labels or replace_deleted is false, generate new ones
        while (labels.size() < size) {
          labels.push_back(static_cast<uint32_t>(++maxLabel));
        }
      }

      return labels;
    }

    std::vector<uint32_t> addItems(const std::vector<std::vector<float>>& vec, bool replace_deleted = false) {
      std::lock_guard<std::mutex> lock(mutate_lock_);

      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (vec.size() <= 0) {
        if (EmscriptenFileSystemManager::debugLogs) printf("The number of vectors and ids must be greater than 0.\n");
        throw std::runtime_error("The number of vectors and ids must be greater than 0.");
      }

      if (index_->cur_element_count + vec.size() > index_->max_elements_) {
        if (EmscriptenFileSystemManager::debugLogs) printf("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: %zu\n", index_->max_elements_);
        throw std::runtime_error("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: " + std::to_string(index_->max_elements_));
      }

      {
        std::lock_guard<std::mutex> lock(index_->global);
        // Generate labels for the vectors to be added
        std::vector<uint32_t> labels = generateLabels(vec.size(), replace_deleted);

        try {
          for (size_t i = 0; i < vec.size(); ++i) {
            if (vec[i].size() != dim_) {
              if (EmscriptenFileSystemManager::debugLogs) printf("Invalid vector size at index %zu. Must be equal to the dimension of the space. The dimension of the space is %d.\n", i, dim_);
              throw std::invalid_argument("Invalid vector size at index " + std::to_string(i) + ". Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_) + ".");
            }

            std::vector<float>& mutableVec = const_cast<std::vector<float>&>(vec[i]);

            if (normalize_) {
              internal::normalizePoints(mutableVec);
            }

            index_->addPoint(reinterpret_cast<void*>(mutableVec.data()), static_cast<hnswlib::labeltype>(labels[i]), replace_deleted);
          }
          autoSaveIndex();
          return labels;
        }
        catch (const std::exception& e) {
          if (EmscriptenFileSystemManager::debugLogs) printf("Could not addItems %s\n", e.what());
          throw std::runtime_error("Could not addItems " + std::string(e.what()));
        }
      }
    }

    void addPoint(const std::vector<float>& vec, uint32_t idx, bool replace_deleted = false) {
      std::lock_guard<std::mutex> lock(mutate_lock_);

      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (vec.size() != dim_) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is %d.\n", this->dim_);
        throw std::invalid_argument("Invalid vector size. Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_) + ".");
      }

      std::vector<float>& mutableVec = const_cast<std::vector<float>&>(vec);

      if (normalize_) {
        internal::normalizePoints(mutableVec);
      }

      if (index_->cur_element_count == index_->max_elements_) {
        if (EmscriptenFileSystemManager::debugLogs) printf("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: %zu\n", index_->max_elements_);
        throw std::runtime_error("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: " + std::to_string(index_->max_elements_));
      }

      try {
        index_->addPoint(reinterpret_cast<void*>(mutableVec.data()), static_cast<hnswlib::labeltype>(idx), replace_deleted);

        autoSaveIndex();
      }
      catch (const std::exception& e) {
        if (EmscriptenFileSystemManager::debugLogs) printf("HNSWLIB ERROR: %s\n", e.what());
        throw std::runtime_error("HNSWLIB ERROR: " + std::string(e.what()));
      }
    }

    /// @brief Related to addItems which has automatic labeling logic.
    /// @param vec 
    /// @param idVec 
    /// @param replace_deleted 
    void addPoints(const std::vector<std::vector<float>>& vec, const std::vector<uint32_t>& idVec, bool replace_deleted = false) {
      std::lock_guard<std::mutex> lock(mutate_lock_);
      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (vec.size() != idVec.size()) {
        if (EmscriptenFileSystemManager::debugLogs) printf("The number of vectors and ids must be the same.\n");
        throw std::runtime_error("The number of vectors and ids must be the same.");
      }

      if (vec.size() <= 0) {
        if (EmscriptenFileSystemManager::debugLogs) printf("The number of vectors and ids must be greater than 0.\n");
        throw std::runtime_error("The number of vectors and ids must be greater than 0.");
      }

      if (index_->cur_element_count + idVec.size() > index_->max_elements_) {
        if (EmscriptenFileSystemManager::debugLogs) printf("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: %zu\n", index_->max_elements_);
        throw std::runtime_error("The maximum number of elements has been reached in index, please increased the index max_size.  max_size: " + std::to_string(index_->max_elements_));
      }

      try {
        for (size_t i = 0; i < vec.size(); ++i) {
          if (vec[i].size() != dim_) {
            if (EmscriptenFileSystemManager::debugLogs) printf("Invalid vector size at index %zu. Must be equal to the dimension of the space. The dimension of the space is %d.\n", i, dim_);
            throw std::invalid_argument("Invalid vector size at index " + std::to_string(i) + ". Must be equal to the dimension of the space. The dimension of the space is " + std::to_string(this->dim_) + ".");
          }

          std::vector<float>& mutableVec = const_cast<std::vector<float>&>(vec[i]);

          if (normalize_) {
            internal::normalizePoints(mutableVec);
          }

          index_->addPoint(reinterpret_cast<void*>(mutableVec.data()), static_cast<hnswlib::labeltype>(idVec[i]), replace_deleted);
        }

        autoSaveIndex();
      }
      catch (const std::exception& e) {
        throw std::runtime_error("Could not addPoints " + std::string(e.what()));
      }
    }



    int getMaxElements() {
      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      return index_->max_elements_;
    }

    void markDelete(uint32_t idx) {
      std::lock_guard<std::mutex> update_lock(label_cache_lock_);
      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      index_->markDelete(static_cast<hnswlib::labeltype>(idx));

      autoSaveIndex();
      updateLabelCaches();
    }

    void markDeleteItems(const std::vector<uint32_t>& labelsVec) {
      std::lock_guard<std::mutex> update_lock(label_cache_lock_);
      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      try {
        for (const hnswlib::labeltype& label : labelsVec) {
          index_->markDelete(static_cast<hnswlib::labeltype>(label));
        }

        autoSaveIndex();
        updateLabelCaches();
      }
      catch (const std::exception& e) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Could not markDeleteItems %s\n", e.what());
        throw std::runtime_error("Could not markDeleteItems " + std::string(e.what()));
      }
    }


    void unmarkDelete(uint32_t idx) {
      std::lock_guard<std::mutex> update_lock(label_cache_lock_);
      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      index_->unmarkDelete(static_cast<hnswlib::labeltype>(idx));

      autoSaveIndex();
      updateLabelCaches();
    }

    emscripten::val searchKnn(const std::vector<float>& vec, uint32_t k, emscripten::val js_filterFn = emscripten::val::undefined()) {
      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      if (vec.size() != dim_) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Invalid the given array length (expected %lu, but got %zu).\n", static_cast<unsigned long>(dim_), vec.size());
        throw std::invalid_argument("Invalid the given array length (expected " + std::to_string(dim_) + ", but got " +
          std::to_string(vec.size()) + ").");
      }

      if (k > index_->max_elements_) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Invalid the number of k-nearest neighbors (cannot be given a value greater than `maxElements`: %zu).\n", index_->max_elements_);
        throw std::invalid_argument("Invalid the number of k-nearest neighbors (cannot be given a value greater than `maxElements`: " +
          std::to_string(index_->max_elements_) + ").");
      }
      if (k <= 0) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Invalid the number of k-nearest neighbors (must be a positive number).\n");
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
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }

      return index_ == nullptr ? 0 : static_cast<uint32_t>(index_->cur_element_count);
    }

    uint32_t getNumDimensions() const {
      return dim_;
    }

    uint32_t getEfSearch() const {
      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
        throw std::runtime_error("Search index has not been initialized, call `initIndex` in advance.");
      }
      return index_ == nullptr ? 0 : index_->ef_;
    }

    void setEfSearch(uint32_t ef) {
      if (index_ == nullptr) {
        if (EmscriptenFileSystemManager::debugLogs) printf("Search index has not been initialized, call `initIndex` in advance.\n");
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
      .constructor<const std::string&, uint32_t, const std::string&>()
      .function("initIndex", &HierarchicalNSW::initIndex)
      .function("isIndexInitialized", &HierarchicalNSW::isIndexInitialized)
      .function("readIndex", &HierarchicalNSW::readIndex)
      .function("writeIndex", &HierarchicalNSW::writeIndex)
      .function("resizeIndex", &HierarchicalNSW::resizeIndex)
      .function("getPoint", &HierarchicalNSW::getPoint)
      .function("addPoint", &HierarchicalNSW::addPoint)
      .function("addPoints", &HierarchicalNSW::addPoints)
      .function("addItems", &HierarchicalNSW::addItems)
      .function("getUsedLabels", &HierarchicalNSW::getUsedLabels)
      .function("getDeletedLabels", &HierarchicalNSW::getDeletedLabels)
      .function("getMaxElements", &HierarchicalNSW::getMaxElements)
      .function("markDelete", &HierarchicalNSW::markDelete)
      .function("markDeleteItems", &HierarchicalNSW::markDeleteItems)
      .function("unmarkDelete", &HierarchicalNSW::unmarkDelete)
      .function("getCurrentCount", &HierarchicalNSW::getCurrentCount)
      .function("getNumDimensions", &HierarchicalNSW::getNumDimensions)
      .function("getEfSearch", &HierarchicalNSW::getEfSearch)
      .function("setEfSearch", &HierarchicalNSW::setEfSearch)
      .function("searchKnn", &HierarchicalNSW::searchKnn)
      ;

    function("setIdbfsSynced", &setIdbfsSynced);

    emscripten::class_<EmscriptenFileSystemManager>("EmscriptenFileSystemManager")
      .constructor<>()
      .class_function("initializeFileSystem", &EmscriptenFileSystemManager::initializeFileSystem, emscripten::allow_raw_pointer<const char*>())
      .class_function("isInitialized", &EmscriptenFileSystemManager::isInitialized)
      .class_function("syncFS", &EmscriptenFileSystemManager::syncFS)
      .class_function("setDebugLogs", &EmscriptenFileSystemManager::setDebugLogs)
      .class_function("isSynced", &EmscriptenFileSystemManager::isSynced)
      .class_function("checkFileExists", &EmscriptenFileSystemManager::checkFileExists);


  }

}  // namespace emscripten