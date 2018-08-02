import DBHelper from './dbhelper.js';
import { imgAlts, putFetch } from './utils.js';

let restaurants, neighborhoods, cuisines;
var map;
var markers = [];

const imgObserver = window.lozad();
imgObserver.observe();

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", event => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById("neighborhoods-select");
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement("option");
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById("cuisines-select");

  cuisines.forEach(cuisine => {
    const option = document.createElement("option");
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById("cuisines-select");
  const nSelect = document.getElementById("neighborhoods-select");

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    (error, restaurants) => {
      if (error) {
        // Got an error!
        console.error(error);
      } else {
        resetRestaurants(restaurants);
        fillRestaurantsHTML();
      }
    }
  );
};
window.updateRestaurants = updateRestaurants;

/**
 * Initialize Google map, called from HTML.
 */
const initMap = (() => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new window.google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
})();
window.initMap = initMap;

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById("restaurants-list");
  ul.innerHTML = "";

  // Remove all map markers
  (self.markers || []).forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById("restaurants-list");
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = restaurant => {
  const currRestaurentID = restaurant.id;
  const currentURL = `${DBHelper.DATABASE_URL}/${currRestaurentID}`

  const li = document.createElement("li");
  li.className = "restaurant-item";

  const image = document.createElement("img");
  image.className = "restaurant-img lozad";
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = imgAlts[restaurant.id - 1];
  li.append(image);
  imgObserver.observe();

  const name = document.createElement("h2");
  name.className = "restaurant-name";
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement("p");
  restaurant.className = "restaurant-neighborhood";
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement("p");
  address.className = "restaurant-address";
  address.innerHTML = restaurant.address;
  li.append(address);

  const favorite = document.createElement("button");
  favorite.className = "restaurant-favorite";
  favorite.id = `fav-${restaurant.id}`;
  favorite.onclick = toggleFavorite;

  if (restaurant.is_favorite === true) {
    favorite.innerHTML = 'Unfavor';
  } else {
    favorite.innerHTML = 'Mark as favorite';
  }

  li.append(favorite);

  function toggleFavorite() {
    if (favorite.innerHTML === 'Mark as favorite') {
      // Send fetch to favor
      favorite.innerHTML = 'Unfavor';
      makeFavorite();
    } else {
      favorite.innerHTML = 'Mark as favorite';
      // Send fetch to unfavor
      unFavorite();
    }
  }

  function makeFavorite() {
    putFetch(currentURL, {
      'is_favorite': true
    })
  }

  function unFavorite() {
    putFetch(currentURL, {
      'is_favorite': false
    })
  }


  const more = document.createElement("a");
  more.setAttribute("aria-label", `View details for ${restaurant.name}`);
  more.setAttribute("role", "button");
  more.className = "restaurant-link-more";
  more.innerHTML = "View Details";
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    window.google.maps.event.addListener(marker, "click", () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
