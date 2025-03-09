/**
 * GeoJSON data for plate boundaries
 * East African Rift/Dead Sea Transform fault system extending through and beyond Israel
 */

// Define PlateData in the global scope immediately
window.PlateData = {
    eastAfricanRift: {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                properties: {
                    name: "Dead Sea Transform",
                    type: "transform fault",
                    description: "Part of the East African Rift system"
                },
                geometry: {
                    type: "LineString",
                    coordinates: [
                        // Extended coordinates for the Dead Sea Transform fault
                        // Starting from Southern Turkey through Syria, Lebanon, Israel, Jordan to Red Sea
                        [36.4, 36.9], // Southern Turkey
                        [36.3, 36.5], // Turkey-Syria border
                        [36.2, 36.2], // Northern Syria
                        [36.1, 35.9],
                        [36.0, 35.6],
                        [36.0, 35.3], // Central Syria
                        [36.0, 35.0],
                        [35.9, 34.7],
                        [35.8, 34.4], // Syria-Lebanon border
                        [35.7, 34.1], // Northern Lebanon
                        [35.65, 33.9],
                        [35.6, 33.8], // Central Lebanon
                        [35.65, 33.6],
                        [35.68, 33.4], // Southern Lebanon
                        [35.7, 33.2], // Lebanon-Israel border
                        [35.6, 33.0],
                        [35.58, 32.8], // Northern Israel
                        [35.57, 32.6], // Sea of Galilee
                        [35.55, 32.4],
                        [35.5, 32.2],
                        [35.5, 32.0], // Jordan Valley
                        [35.5, 31.8],
                        [35.5, 31.6], // Northern Dead Sea
                        [35.5, 31.4], // Dead Sea
                        [35.5, 31.2], // Southern Dead Sea
                        [35.4, 31.0], // Arabah Valley
                        [35.3, 30.8],
                        [35.2, 30.6],
                        [35.1, 30.4],
                        [35.0, 30.2],
                        [34.9, 30.0],
                        [34.9, 29.8], // Gulf of Aqaba/Eilat
                        [34.9, 29.6],
                        [34.9, 29.4],
                        [34.9, 29.2],
                        [34.9, 29.0], // Red Sea
                        [34.9, 28.7],
                        [34.9, 28.5],
                        [34.85, 28.2],
                        [34.8, 27.9], // Deep Red Sea
                        [34.8, 27.6],
                        [34.7, 27.3],
                        [34.7, 27.0], // Southern Red Sea
                        [34.7, 26.7],
                        [34.8, 26.4],
                        [34.9, 26.1], // Continued into East African Rift
                        [35.0, 25.8],
                        [35.1, 25.5] // Connecting to the broader East African Rift system
                    ]
                }
            },
            // Add a branch for the Gulf of Suez
            {
                type: "Feature",
                properties: {
                    name: "Gulf of Suez Rift",
                    type: "divergent boundary",
                    description: "Western branch of the Red Sea Rift"
                },
                geometry: {
                    type: "LineString",
                    coordinates: [
                        [34.9, 29.0], // Junction with the main rift
                        [34.7, 28.8],
                        [34.5, 28.6],
                        [34.3, 28.4],
                        [34.1, 28.2],
                        [33.9, 28.0], // Gulf of Suez
                        [33.7, 27.8],
                        [33.5, 27.6],
                        [33.3, 27.4],
                        [33.1, 27.2], // Deeper into Gulf of Suez
                        [32.9, 27.0], // Connecting to Nile Delta
                        [32.7, 26.8]
                    ]
                }
            },
            // Add the Carmel fault line
            {
                type: "Feature",
                properties: {
                    name: "Carmel Fault",
                    type: "transform fault",
                    description: "Major fault line crossing northern Israel"
                },
                geometry: {
                    type: "LineString",
                    coordinates: [
                        [35.5, 32.8], // Junction with Dead Sea Transform
                        [35.3, 32.7],
                        [35.1, 32.6], // Mt. Carmel
                        [34.9, 32.5],
                        [34.8, 32.4], // Mediterranean coastline
                        [34.6, 32.3], // Extending offshore
                        [34.4, 32.2]  // Extending further into Mediterranean 
                    ]
                }
            },
            // Add the Sinai microplate's eastern boundary
            {
                type: "Feature",
                properties: {
                    name: "Sinai Microplate Eastern Boundary",
                    type: "transform fault",
                    description: "Eastern boundary of the Sinai microplate"
                },
                geometry: {
                    type: "LineString",
                    coordinates: [
                        [34.9, 28.7], // Connection with Dead Sea Transform
                        [35.0, 28.5],
                        [35.2, 28.3],
                        [35.4, 28.1], // Eastern Sinai Peninsula
                        [35.6, 27.9],
                        [35.8, 27.7] // Extending into Saudi Arabia
                    ]
                }
            }
        ]
    }
};

// Signal that PlateData is loaded
console.log('PlateData module loaded');