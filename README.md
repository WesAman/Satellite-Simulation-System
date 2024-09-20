
Project originally Forked from satvis.space, check them out here.
# [satvis.space](https://satvis.space) ![Node CI](https://github.com/Flowm/satvis/workflows/Node%20CI/badge.svg)

Satellite orbit visualization and pass prediction, I got even more curious when studying orbital mechanics on my own time and was curious how a starlink satellite would
communicate with nearby satellites incase of any issues would arise. One helpful thing for a satellite tracking app would be to track a single satellite and detect NEARBY satellites.

## Features
- Calculate position and orbit of satellites from TLE
- Set groundstation through geolocation or pick on map
- Calculate passes for a set groundstation
- Local browser notifications for passes
- Serverless architecture
- Works offline as Progressive Web App (PWA)
- *Added:* Nearby Satellite Tracking

## Built With
- [CesiumJS](https://cesiumjs.org)
- [Satellite.js](https://github.com/shashwatak/satellite-js)
- [Vue.js](https://vuejs.org)
- [Workbox](https://developers.google.com/web/tools/workbox)

## Development

### Setup
Initialize submodules and install npm build dependencies:
```
git submodule update --init
npm clean-install
```

### Run
- `npm run start` for the dev server
- `npm run build` to build the application (output in `dist` folder)
- `npm run serve` to build the application and serve with static webserver
- `npm run update-tle` to retrieve the latest satellite TLEs from NORAD
- 
<p align="center"><a href="https://apps.apple.com/app/satvis/id1441084766"><img src="src/assets/app-store-badge.svg" width="250" /></a></p>

## License
This project is licensed under the MIT License - see `LICENSE` file for details.

## Acknowledgements
Inspired by a visualization developed for the [MOVE-II CubeSat project](https://www.move2space.de) by Jonathan, Marco and Flo.
