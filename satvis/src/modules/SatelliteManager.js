import { SatelliteComponentCollection } from "./SatelliteComponentCollection";
import { GroundStationEntity } from "./GroundStationEntity";

import { useSatStore } from "../stores/sat";
import { CesiumCleanupHelper } from "./util/CesiumCleanupHelper";
import * as satellite from 'satellite.js';


export class SatelliteManager {
  #enabledComponents = ["Point", "Label"];

  #enabledTags = [];

  #enabledSatellites = [];

  constructor(viewer) {
    this.viewer = viewer;

    this.satellites = [];
    this.availableComponents = ["Point", "Label", "Orbit", "Orbit track", "Ground track", "Sensor cone", "3D model"];

    this.viewer.trackedEntityChanged.addEventListener(() => {
      if (this.trackedSatellite) {
        this.getSatellite(this.trackedSatellite).show(this.#enabledComponents);
      }
      useSatStore().trackedSatellite = this.trackedSatellite;
    });
  }

detectNearbySatellites(selectedSatellite, thresholdDistance = 250) {
  const nearbySatellites = [];
  const selectedTle = selectedSatellite.props.orbit.tle;

  this.satellites.forEach((sat) => {
    if (sat !== selectedSatellite) {
      const satelliteTle = sat.props.orbit.tle;
      const distance = this.computeGeodeticDistanceFromTLE(selectedTle, satelliteTle);  // Compute distance using geodetic coordinates

      if (distance < thresholdDistance) {
        nearbySatellites.push(sat);
        // this.communicateWith(sat);
        console.log(`Nearby satellite detected: ${sat.props.name} at distance ${distance.toFixed(2)} km`);
      }
    }
  });

  return nearbySatellites;
}

// Compute geodetic distance between two satellites
computeGeodeticDistanceFromTLE(tle1, tle2) {
  const now = new Date();

  // Get geodetic positions for both satellites
  const pos1 = this.getGeodeticFromTLE(tle1, now);
  const pos2 = this.getGeodeticFromTLE(tle2, now);

  if (!pos1 || !pos2) {
    console.error('Failed to compute satellite geodetic positions from TLEs');
    return Infinity;
  }

  // Compute the Haversine distance between two points (lat, long, alt)
  return this.haversineDistance(pos1, pos2);

}




// Convert ECI to Geodetic (latitude, longitude, altitude)
getGeodeticFromTLE(tle, time) {
  const satrec = satellite.twoline2satrec(tle[1], tle[2]);
  const positionAndVelocity = satellite.propagate(satrec, time);
  const positionEci = positionAndVelocity.position;

  if (!positionEci) {
    return null;
  }

  const gmst = satellite.gstime(time);
  const positionGd = satellite.eciToGeodetic(positionEci, gmst);

  const latitude = satellite.degreesLat(positionGd.latitude);
  const longitude = satellite.degreesLong(positionGd.longitude);
  const altitude = positionGd.height / 1000;  // Convert to km

  return { latitude, longitude, altitude };
}




 // Use satellite.js to propagate position from TLE data
 getPositionFromTLE(tle, time) {
  const satrec = satellite.twoline2satrec(tle[1], tle[2]);  // Parse the TLE data
  const positionAndVelocity = satellite.propagate(satrec, time);  // Get position and velocity
  const positionEci = positionAndVelocity.position;

  if (!positionEci) {
    return null;
  }

  // Return position in ECI coordinates
  return {
    x: positionEci.x,
    y: positionEci.y,
    z: positionEci.z
  };
}


// Track a nearby satellite (this function assumes you already have a track() function for satellites)
trackSatellite(satellite) {
  console.log(satellite.track());

  // console.log(Tracking nearby satellite: ${satellite.props.name});
}

// Main method to track the closest satellite
trackNearbySatellites(selectedSatellite) {
  const nearbySatellites = this.detectNearbySatellites(selectedSatellite, 250);  // 250 km threshold
  nearbySatellites.forEach((satellite) => {
    this.trackSatellite(satellite);  // Track the nearby satellites
  });
}


// Haversine formula to compute distance between two geodetic points
haversineDistance(pos1, pos2) {
  const R = 6371;  // Radius of the Earth in kilometers

  const lat1 = pos1.latitude;
  const lon1 = pos1.longitude;
  const alt1 = pos1.altitude;

  const lat2 = pos2.latitude;
  const lon2 = pos2.longitude;
  const alt2 = pos2.altitude;

  const dLat = this.degToRad(lat2 - lat1);
  const dLon = this.degToRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Haversine distance on the Earth's surface
  const distance = R * c;

  // Include altitude difference
  const altitudeDiff = Math.abs(alt1 - alt2);

  // Compute total distance considering altitude difference
  return Math.sqrt(distance ** 2 + altitudeDiff ** 2);
}


// Convert degrees to radians
degToRad(deg) {
  return deg * (Math.PI / 180);
}

// Main method to track the closest satellites
trackNearbySatellites(selectedSatellite) {
  const nearbySatellites = this.detectNearbySatellites(selectedSatellite, 250);  // 250 km threshold
  nearbySatellites.forEach((satellite) => {
    this.trackSatellite(satellite);  // Track the nearby satellites
  });
}

// Basic satellite tracking function (replace as needed)
trackSatellite(satellite) {
  console.log(`Tracking satellite: ${satellite.props.name}`);
}


  

  addFromTleUrls(urlTagList) {
    // Initiate async download of all TLE URLs and update store afterwards
    const promises = urlTagList.map(([url, tags]) => this.addFromTleUrl(url, tags, false));
    Promise.all(promises).then(() => this.updateStore());
  }

  addFromTleUrl(url, tags, updateStore = true) {
    return fetch(url, {
      mode: "no-cors",
    }).then((response) => {
      if (!response.ok) {
        throw Error(response.statusText);
      }
      return response;
    }).then((response) => response.text())
      .then((data) => {
        const lines = data.split(/\r?\n/);
        for (let i = 3; i < lines.length; i + 3) {
          const tle = lines.splice(i - 3, i).join("\n");
          this.addFromTle(tle, tags, updateStore);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }

  addFromTle(tle, tags, updateStore = true) {
    const sat = new SatelliteComponentCollection(this.viewer, tle, tags);
    if (!sat.props.orbit || typeof sat.props.orbit.positionECI !== 'function') {
      console.error(`Failed to initialize orbit for satellite: ${sat.props.name}`);
    }
    this.#add(sat);
    if (updateStore) {
      this.updateStore();
    }
  }

  #add(newSat) {
    const existingSat = this.satellites.find((sat) => sat.props.satnum === newSat.props.satnum && sat.props.name === newSat.props.name);
    if (existingSat) {
      existingSat.props.addTags(newSat.props.tags);
      if (newSat.props.tags.some((tag) => this.#enabledTags.includes(tag))) {
        existingSat.show(this.#enabledComponents);
      }
      return;
    }
    if (this.groundStationAvailable) {
      newSat.groundStation = this.groundStation.position;
    }
    this.satellites.push(newSat);

    if (this.satIsActive(newSat)) {
      newSat.show(this.#enabledComponents);
      if (this.pendingTrackedSatellite === newSat.props.name) {
        this.trackedSatellite = newSat.props.name;
      }
    }
  }

  updateStore() {
    const satStore = useSatStore();
    satStore.availableTags = this.tags;
    satStore.availableSatellitesByTag = this.taglist;
  }

  get taglist() {
    const taglist = {};
    this.satellites.forEach((sat) => {
      sat.props.tags.forEach((tag) => {
        (taglist[tag] = taglist[tag] || []).push(sat.props.name);
      });
    });
    Object.values(taglist).forEach((tag) => {
      tag.sort();
    });
    return taglist;
  }

  get selectedSatellite() {
    const satellite = this.satellites.find((sat) => sat.isSelected);
    return satellite ? satellite.props.name : "";
  }

  get trackedSatellite() {
    const satellite = this.satellites.find((sat) => sat.isTracked);
    return satellite ? satellite.props.name : "";
  }
  set trackedSatellite(name) {
    if (!name) {
        if (this.trackedSatellite) {
            this.viewer.trackedEntity = undefined;
        }
        return;
    }

    const selectedSatellite = this.getSatellite(name);

    if (selectedSatellite) {
        // Check if the sampled position is defined
        if (!selectedSatellite.props.sampledPosition || !selectedSatellite.props.sampledPosition.fixed) {
            console.error('Sampled position or fixed position is missing for this satellite');
            return;
        }

        // Log components or satellite information
        console.log("Selected Satellite Orbit Data:", selectedSatellite.props.orbit);

        // You can extract more detailed satellite information
        const satelliteInfo = {
            name: selectedSatellite.props.name,
            orbit: selectedSatellite.props.orbit,
            position: selectedSatellite.props.sampledPosition.fixed,
            passes: selectedSatellite.props.passes, 
            tags: selectedSatellite.props.tags, 
        };

        console.log("Satellite Info:", satelliteInfo);

        // Call detectNearbySatellites method correctly
        this.detectNearbySatellites(selectedSatellite, 250);  // 250 km threshold   check
        //check
        selectedSatellite.track();
        this.pendingTrackedSatellite = undefined;
        console.log("'we're tracking nearby satellites");
    } else {
        this.pendingTrackedSatellite = name;
    }

    const nearbySatellites = this.detectNearbySatellites(selectedSatellite);

    nearbySatellites.forEach((nearbySatellite) => {
        // console.log(`Nearby satellite detected:', ${nearbySatellite.props.name}`);
        this.trackSatellite(nearbySatellite); 
        // console.log(nearbySatellite)
    });
}

  // Method to retrieve a satellite by its name
  getSatellite(name) {
    return this.satellites.find(satellite => satellite.name === name);
  }


  get visibleSatellites() {
    return this.satellites.filter((sat) => sat.created);
  }

  get monitoredSatellites() {
    return this.satellites.filter((sat) => sat.props.pm.active).map((sat) => sat.props.name);
  }

  set monitoredSatellites(sats) {
    this.satellites.forEach((sat) => {
      if (sats.includes(sat.props.name)) {
        sat.props.notifyPasses();
      } else {
        sat.props.pm.clearTimers();
      }
    });
  }

  get satelliteNames() {
    return this.satellites.map((sat) => sat.props.name);
  }

  getSatellite(name) {
    return this.satellites.find((sat) => sat.props.name === name);
  }

  get enabledSatellites() {
    return this.#enabledSatellites;
  }

  set enabledSatellites(newSats) {
    this.#enabledSatellites = newSats;
    this.showEnabledSatellites();

    const satStore = useSatStore();
    satStore.enabledSatellites = newSats;
  }

  get tags() {
    const tags = this.satellites.map((sat) => sat.props.tags);
    return [...new Set([].concat(...tags))];
  }

  getSatellitesWithTag(tag) {
    return this.satellites.filter((sat) => sat.props.hasTag(tag));
  }

  /**
   * Returns true if the satellite is enabled by tag or name
   * @param {SatelliteComponentCollection} sat
   * @returns {boolean} true if the satellite is enabled
   */
  satIsActive(sat) {
    const enabledByTag = this.#enabledTags.some((tag) => sat.props.hasTag(tag));
    const enabledByName = this.#enabledSatellites.includes(sat.props.name);
    return enabledByTag || enabledByName;
  }

  get activeSatellites() {
    return this.satellites.filter((sat) => this.satIsActive(sat));
  }

  showEnabledSatellites() {
    this.satellites.forEach((sat) => {
      if (this.satIsActive(sat)) {
        sat.show(this.#enabledComponents);
      } else {
        sat.hide();
      }
    });
    if (this.visibleSatellites.length === 0) {
      CesiumCleanupHelper.cleanup(this.viewer);
    }
  }

  get enabledTags() {
    return this.#enabledTags;
  }

  set enabledTags(newTags) {
    this.#enabledTags = newTags;
    this.showEnabledSatellites();

    const satStore = useSatStore();
    satStore.enabledTags = newTags;
  }

  get components() {
    const components = this.satellites.map((sat) => sat.components);
    return [...new Set([].concat(...components))];
  }

  get enabledComponents() {
    return this.#enabledComponents;
  }

  set enabledComponents(newComponents) {
    const oldComponents = this.#enabledComponents;
    const add = newComponents.filter((x) => !oldComponents.includes(x));
    const del = oldComponents.filter((x) => !newComponents.includes(x));
    add.forEach((component) => {
      this.enableComponent(component);
    });
    del.forEach((component) => {
      this.disableComponent(component);
    });
  }

  enableComponent(componentName) {
    if (!this.#enabledComponents.includes(componentName)) {
      this.#enabledComponents.push(componentName);
    }

    this.activeSatellites.forEach((sat) => {
      sat.enableComponent(componentName);
    });
  }

  disableComponent(componentName) {
    this.#enabledComponents = this.#enabledComponents.filter((name) => name !== componentName);

    this.activeSatellites.forEach((sat) => {
      sat.disableComponent(componentName);
    });
  }

  get groundStationAvailable() {
    return (typeof this.groundStation !== "undefined");
  }

  focusGroundStation() {
    if (this.groundStationAvailable) {
      this.groundStation.track();
    }
  }

  setGroundStation(position) {
    if (this.groundStationAvailable) {
      this.groundStation.hide();
    }
    if (position.height < 1) {
      position.height = 0;
    }

    // Create groundstation entity
    this.groundStation = new GroundStationEntity(this.viewer, this, position);
    this.groundStation.show();

    // Set groundstation for all satellites
    this.satellites.forEach((sat) => {
      sat.groundStation = this.groundStation.position;
    });

    // Update store for url state
    const satStore = useSatStore();
    satStore.groundstation = [position.latitude, position.longitude];
  }



}