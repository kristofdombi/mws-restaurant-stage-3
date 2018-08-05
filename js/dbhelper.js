import idb from "./idb.js";

/**
 * Common database helper functions.
 */

const IDB_DATABASE = "restaurantDatabase";
const IDB_OBJECT = "restaurantObject";
const IDB_REVIEWS_OBJECT = "reviewsObject";
const IDB_REVIEWS_OBJECT_OFFLINE = "reviewsOfflineObject";
const PORT = 1337; // Change this to your server port

export default class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return `http://localhost:${PORT}/restaurants`;
  }

  static get DATABASE_URL_REVIEWS() {
    return `http://localhost:${PORT}/reviews?restaurant_id=`;
  }

  /*
   * Create connection with Index db
   */
  static openIDBConnection() {
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }
    return idb.open(IDB_DATABASE, 1, upgradeDatabase => {
      const store = upgradeDatabase.createObjectStore(IDB_OBJECT, {
        keyPath: "id"
      });
      store.createIndex("by-id", "id");
      const reviewsStore = upgradeDatabase.createObjectStore(
        IDB_REVIEWS_OBJECT,
        {
          keyPath: "id"
        }
      );
      reviewsStore.createIndex("restaurant_id", "restaurant_id");
      upgradeDatabase.createObjectStore(IDB_REVIEWS_OBJECT_OFFLINE, {
        keyPath: "updatedAt"
      });
    });
  }

  /*
   * Save data to IDB database
   */
  static saveToIDB(data, storeToSaveInto = IDB_OBJECT) {
    return DBHelper.openIDBConnection().then(db => {
      if (!db) {
        return;
      }
      switch (storeToSaveInto) {
        case IDB_REVIEWS_OBJECT: {
          const tx = db.transaction(IDB_REVIEWS_OBJECT, "readwrite");
          const store = tx.objectStore(IDB_REVIEWS_OBJECT);
          store.put(data);
          return tx.complete;
        }

        case IDB_REVIEWS_OBJECT_OFFLINE: {
          const tx = db.transaction(IDB_REVIEWS_OBJECT_OFFLINE, "readwrite");
          const store = tx.objectStore(IDB_REVIEWS_OBJECT_OFFLINE);
          store.put(data);
          return tx.complete;
        }

        default: {
          const tx = db.transaction(IDB_OBJECT, "readwrite");
          const store = tx.objectStore(IDB_OBJECT);
          data.forEach(restaurant => {
            store.put(restaurant);
          });
          return tx.complete;
        }
      }
    });
  }

  /**
   * Fetch all reviews
   */
  static fetchReviewsFromAPI(id, cb) {
    const url = `${DBHelper.DATABASE_URL_REVIEWS}${id}`;
    return fetch(url)
      .then(res => res.json())
      .then(data => {
        for (let key in data) {
          DBHelper.saveToIDB(data[key], IDB_REVIEWS_OBJECT);
        }
        cb(null, data);
        return data;
      })
      .catch(e => cb(e, null));
  }

  static fetchCachedReviews(id) {
    return DBHelper.openIDBConnection().then(db => {
      if (!db) {
        return;
      }
      const tx = db.transaction(IDB_REVIEWS_OBJECT, "readonly");
      const store = tx.objectStore(IDB_REVIEWS_OBJECT).index("restaurant_id");

      return store.getAll(id);
    });
  }

  static fetchReviews(id, cb) {
    return DBHelper.fetchCachedReviews(id)
      .then(reviews => {
        // IF IDB has value
        if (reviews.length) {
          cb(null, reviews);
          return Promise.resolve(reviews);
        } else {
          return DBHelper.fetchReviewsFromAPI(id, cb);
        }
      })
      .catch(error => {
        console.log('alma: ', error);
        cb(error, null);
      });
  }

  static addReview(data, cb) {
    return fetch(`http://localhost:${port}/reviews`, {
      body: JSON.stringify(data),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      method: "POST"
    }).then(res => {
      res.json().then(data => {
        DBHelper.saveToIDB(data, IDB_REVIEWS_OBJECT);
        return data;
      })
      cb(null);
    })
    .catch(err => {
      data["updatedAt"] = new Date().getTime();
      data["createdAt"] = new Date().getTime();

      DBHelper.saveToIDB(data, IDB_REVIEWS_OBJECT_OFFLINE);
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurantsFromAPI() {
    return fetch(DBHelper.DATABASE_URL).then(res =>
      res.json().then(restaurants => {
        DBHelper.saveToIDB(restaurants);
        return restaurants;
      })
    );
  }

  static async fetchRestaurants(cb) {
    return DBHelper.fetchCachedRestaurants()
      .then(restaurants => {
        if (restaurants.length) {
          return Promise.resolve(restaurants);
        } else {
          return DBHelper.fetchRestaurantsFromAPI();
        }
      })
      .then(restaurants => {
        cb(null, restaurants);
      })
      .catch(error => {
        cb(error, null);
      });
  }

  /**
   * Get cached restaurants from IDB.
   */
  static fetchCachedRestaurants() {
    return DBHelper.openIDBConnection().then(db => {
      if (!db) {
        return;
      }
      const store = db.transaction(IDB_OBJECT).objectStore(IDB_OBJECT);
      return store.getAll();
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) {
          // Got the restaurant
          callback(null, restaurant);
        } else {
          // Restaurant does not exist in the database
          callback("Restaurant does not exist", null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != "all") {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != "all") {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter(
          (v, i) => cuisines.indexOf(v) == i
        );
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (restaurant.photograph) {
      return `/img/${restaurant.photograph}.webp`;
    }
    return "https://placehold.it/400x200";
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }
}
