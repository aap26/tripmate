import React, { useState, useRef } from 'react';
import {
  GoogleMap,
  LoadScript,
  Autocomplete,
  DirectionsRenderer,
  Marker
} from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 42.3601,
  lng: -71.0589
};

const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c9c9c9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
];

const categories = [
  'Gas Stations',
  'Sight Seeing',
  'Restrooms',
  'Restaurants',
  'Groceries',
  'Charging Stations'
];

const categoryTypeMap = {
  'Gas Stations': 'gas_station',
  'Sight Seeing': 'tourist_attraction',
  'Restrooms': 'convenience_store',
  'Restaurants': 'restaurant',
  'Groceries': 'supermarket',
  'Charging Stations': 'charging_station'
};

const reverseTypeMap = Object.fromEntries(
  Object.entries(categoryTypeMap).map(([label, type]) => [type, label])
);

const haversineDistance = (coord1, coord2) => {
  if (
    typeof coord1?.lat !== 'number' ||
    typeof coord1?.lng !== 'number' ||
    typeof coord2?.lat !== 'number' ||
    typeof coord2?.lng !== 'number'
  ) {
    return 0.0;
  }

  const toRad = (x) => (x * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function TripPlannerUI() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [directions, setDirections] = useState(null);
  const [checkedCategories, setCheckedCategories] = useState([]);
  const [suggestedStops, setSuggestedStops] = useState([]);
  const [addedStops, setAddedStops] = useState([]);
  const originRef = useRef(null);
  const destinationRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [originLatLng, setOriginLatLng] = useState(null);

  const handleCategoryChange = (category) => {
    setCheckedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSearch = () => {
    if (!originRef.current || !destinationRef.current) return;
    const originPlace = originRef.current.getPlace();
    const destPlace = destinationRef.current.getPlace();
    if (!originPlace || !destPlace) return;

    setOrigin(originPlace.formatted_address);
    setDestination(destPlace.formatted_address);
    const originLocation = {
      lat: originPlace.geometry.location.lat(),
      lng: originPlace.geometry.location.lng()
    };
    setOriginLatLng(originLocation);

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: originPlace.formatted_address,
        destination: destPlace.formatted_address,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);

          const path = result.routes[0].overview_path;
          const samplePoints = path.filter((_, i) => i % 10 === 0);
          fetchStopsAlongRoute(samplePoints, originLocation);
        }
      }
    );
  };

  const fetchStopsAlongRoute = (samplePoints, originLoc) => {
    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );

    let allResults = [];
    let pendingRequests = 0;

    samplePoints.forEach((point) => {
      const location = { lat: point.lat(), lng: point.lng() };
      checkedCategories.forEach((label) => {
        const type = categoryTypeMap[label];
        if (!type) return;

        pendingRequests++;
        service.nearbySearch(
          {
            location,
            radius: label === 'Sight Seeing' ? 8000 : 3200,
            type
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              const withDistances = results.map((place) => {
                const stopLoc = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                };
                const totalDistance = haversineDistance(originLoc, stopLoc);
                return {
                  ...place,
                  distance: totalDistance,
                  type
                };
              });
              allResults = [...allResults, ...withDistances];
            }
            pendingRequests--;
            if (pendingRequests === 0) {
              const seen = new Set();
              const unique = allResults.filter((r) => {
                if (seen.has(r.place_id)) return false;
                seen.add(r.place_id);
                return true;
              });
              const sorted = unique.sort((a, b) => a.distance - b.distance);
              setSuggestedStops(sorted);
            }
          }
        );
      });
    });
  };

  const handleAddStop = (stop) => {
    if (!addedStops.some((s) => s.place_id === stop.place_id)) {
      setAddedStops((prev) => [...prev, stop]);
    }
  };

  const handleDeleteStop = (stop) => {
    setAddedStops((prev) => prev.filter((s) => s.place_id !== stop.place_id));
  };

  const renderCard = (place, onClick, showDistance = false, isAdded = false, onDelete = null) => (
    <div
      key={place.place_id}
      style={{
        border: '1px solid #ccc',
        padding: '0.5rem',
        marginBottom: '0.5rem',
        borderRadius: '6px',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
      onClick={onClick}
    >
      <div>
        <div style={{ fontWeight: 'bold' }}>{place.name}</div>
        <div style={{ fontSize: '0.8rem', color: '#555' }}>
          {reverseTypeMap[place.type] || 'Unknown'} • {place.vicinity}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {place.distance ? (
          <div style={{ fontSize: '0.8rem', color: '#333' }}>
            {place.distance.toFixed(2)} mi
          </div>
        ) : null}
        {isAdded && (
          <button onClick={() => onDelete(place)} style={{ fontSize: '0.7rem' }}>
            ❌
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div
        style={{
          flex: 2,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <LoadScript
          googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
          libraries={['places']}
          onLoad={() => setMapLoaded(true)}
        >
          {mapLoaded && (
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={7} options={{ styles: mapStyle, disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  draggable: true }}>
              {directions && <DirectionsRenderer directions={directions} />}
              {addedStops.map((stop) => (
                <Marker
                  key={stop.place_id}
                  position={{
                    lat: stop.geometry.location.lat(),
                    lng: stop.geometry.location.lng()
                  }}
                />
              ))}
            </GoogleMap>
          )}
        </LoadScript>

        <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem' }}>
          <h4>Added Stops</h4>
          {addedStops.map((place) =>
            renderCard(place, null, true, true, handleDeleteStop)
          )}
        </div>

        <button
          style={{
          width:'100%',
          backgroundColor: 'blue',
          color: 'white',
          padding: '0.5rem 1rem',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        >
          Start Trip
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: '1rem',
          backgroundColor: '#fafafa',
          borderLeft: '1px solid #ddd',
          overflowY: 'auto'
        }}
      >
        <h3>TripMate : Smart Road Trip Planner</h3>

        {mapLoaded && (
          <>
            <Autocomplete onLoad={(auto) => (originRef.current = auto)}>
              <input
                type="text"
                placeholder="Origin"
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
            </Autocomplete>
            <Autocomplete onLoad={(auto) => (destinationRef.current = auto)}>
              <input
                type="text"
                placeholder="Destination"
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
            </Autocomplete>
          </>
        )}

        {categories.map((category, idx) => (
          <div key={idx}>
            <label>
              <input
                type="checkbox"
                checked={checkedCategories.includes(category)}
                onChange={() => handleCategoryChange(category)}
              />{' '}
              {category}
            </label>
          </div>
        ))}

        <button
          onClick={handleSearch}
          style={{
            width:'100%',
            backgroundColor: 'red',
            color: 'white',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '0.5rem' 
          }}
        >
        Search
      </button>

        <div style={{ marginTop: '0rem', maxHeight: '50vh', overflowY: 'auto' }}>
          <h4>Suggested Stops (click to add)</h4>
          {suggestedStops.map((place) =>
            renderCard(place, () => handleAddStop(place), true)
          )}
        </div>
      </div>
    </div>
  );
}