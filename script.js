let city = '';

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                document.getElementById("city-name").textContent = "Aktueller Standort";
                getWeatherData(lat, lon);
            },
            error => {
                alert("Fehler bei der Standortbestimmung. Fehlercode:" + error.code);

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        alert("Benutzer hat die Anfrage zur Geolokalisierung abgelehnt.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Standortinformationen sind momentan nicht verfügbar.");
                        break;
                    case error.TIMEOUT:
                        alert("Die Anfrage zur Geolokalisierung ist abgelaufen.");
                        break;
                    case error.UNKNOWN_ERROR:
                        alert("Unbekannter Fehler bei der Geolokalisierung.");
                        break;
                }
            }
        );
    } else {
        alert("Dieser Browser unterstützt keine Geolokalisierung.");
    }
}

document.getElementById("city").addEventListener("input", function() {
    const query = this.value.trim();
    if (query.length > 2) {
        fetchCities(query);
    } else {
        clearSuggestions();
    }
});

document.getElementById("search-btn").addEventListener("click", () => {
    const cityInput = document.getElementById("city").value;
    if (cityInput) {
        city = cityInput;
        document.getElementById("city-name").textContent = city;
        getCoordinates(city);
    } else {
        alert("Bitte geben Sie eine Stadt ein.");
    }
});

function fetchCities(query) {
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5`)
    .then(response => response.json())
    .then(data => {
        const suggestions = data.results;
        displaySuggestions(suggestions);
    })
    .catch(error => {
        alert("Fehler beim Abrufen der Städtenamen:", error);
    });
}

function displaySuggestions(suggestions) {
    const suggestionsList = document.getElementById("suggestions");
    suggestionsList.innerHTML = '';

    suggestions.forEach(suggestion => {
        const li = document.createElement("li");
        li.textContent = `${suggestion.name}, ${suggestion.country}`;

        li.addEventListener("click", () => {
            city = suggestion.name;
            document.getElementById("city").value = city;
            document.getElementById("city-name").textContent = city;

            clearSuggestions();
            
            getCoordinates(city);
        });
        suggestionsList.appendChild(li);
    });
}

function clearSuggestions() {
    const suggestionsList = document.getElementById("suggestions");
    suggestionsList.innerHTML = '';
}

function getCoordinates(city) {
  fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`)
      .then(response => response.json())
      .then(data => {
          if (data.results && data.results.length > 0) {
              const lat = data.results[0].latitude;
              const lon = data.results[0].longitude;
              getWeatherData(lat, lon);
          } else {
              alert("Stadt nicht gefunden");
          }
      })
      .catch(error => {
          alert("Fehler beim Abrufen der Stadtkoordinaten.");
      });
}

function getWeatherData(lat, lon) {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&timezone=Europe%2FBerlin`)
        .then(response => response.json())
        .then(data => {

            if (data && data.hourly) {
                const hourlyData = data.hourly;

                const hourlyForecast = hourlyData.temperature_2m.map((temp, index) => {
                    const hour = new Date(hourlyData.time[index]);
                    return {
                        hour: hour,
                        temperature: temp,
                        humidity: hourlyData.relative_humidity_2m[index],
                        windSpeed: hourlyData.wind_speed_10m[index],
                        weatherCode: hourlyData.weathercode[index]
                    };
                });

                const endTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);

                const next24Hours = hourlyForecast.filter((forecast) => {
                    const forecastHour = forecast.hour;

                    return forecastHour >= currentTime && forecastHour <= endTime;
                });

                updateCurrentWeather(hourlyData);
                updateHourlyForecast(next24Hours);
            } else {
            fetchUVIndex(lat, lon);
            fetchWeeklyForecast(lat, lon);
            }
        })
        .catch(error => {
            alert("Fehler beim Abrufen der Wetterdaten.");
        });
}

function fetchUVIndex(lat, lon) {  
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=uv_index`)
  .then(response => response.json())
  .then(data => {
      if (data && data.hourly) {
        const currentHour = new Date().getHours();
          const uvIndex = data.hourly.uv_index[currentHour];
          document.getElementById("uv-index").textContent = uvIndex !== undefined ? uvIndex : "Unbekannt";
      } else {
          document.getElementById("uv-index").textContent = "UV-Daten nicht verfügbar";
      }
  })
  .catch(error => {
      document.getElementById("uv-index").textContent = "UV-Daten nicht verfügbar";
  });
}

function updateCurrentWeather(data) {
    const temperature = data.temperature_2m[0];
    const humidity = data.relative_humidity_2m[0];
    const windSpeed = data.wind_speed_10m[0];
    const weatherCode = data.weathercode[0];

    document.getElementById("temp").textContent = `${Math.round(temperature)}°C`;
    document.getElementById("humidity").textContent = `${humidity}%`;
    document.getElementById("wind").textContent = `${windSpeed} km/h`;

    updateWeatherIcon(weatherCode);
}

function updateWeatherIcon(weatherCode) {
    const iconElement = document.getElementById("icon");
    iconElement.textContent = "";

    let iconClass = "";

    switch (weatherCode) {
        case 0:
            iconClass = "fas fa-sun";  // Sonnig
            break;
        case 1:
        case 2:
            iconClass = "fas fa-cloud-sun";  // Teilweise bewölkt
            break;
        case 3:
        case 45:
            iconClass = "fas fa-cloud";  // Bewölkt oder Nebel
            break;
        case 61:
        case 36:
        case 65:
            iconClass = "fas fa-cloud-rain";  // Regen
            break;
        case 71:
        case 73:
        case 75:
            iconClass = "fas fa-snow"; // Schnee
            break;
        case 80:
        case 81:
        case 82:
            iconClass = "fas fa-cloud-showers-heavy";  // Schauer
            break;
        case 95:
        case 96:
        case 99:
            iconClass = "fas fa-cloud-bolt"; // Gewitter
            break;
        default:
            iconClass = "fas fa-sun";  // Standard: Sonnig
    }

    iconClass += " fa-3x";


    if (iconElement) {
        iconElement.className = iconClass;
    } else {
        alert("Das Icon-Element wurde nicht gefunden!");
    }
}

function updateHourlyForecast(hourlyData) {
    const hourlyContainer = document.getElementById("hourly");
    hourlyContainer.innerHTML = "";

    hourlyData.forEach((data) => {
        const forecastElement = document.createElement("div");
        forecastElement.className = "hourly-forecast";

        forecastElement.innerHTML = `
            <p>${new Date(data.hour).toLocaleTimeString()}</p>
            <p>Temp: ${Math.round(data.temperature)}°C</p>
            <p>Luftfeuchtigkeit: ${data.humidity}%</p>
            <p>Wind: ${data.windSpeed} km/h</p>
        `;
        hourlyContainer.appendChild(forecastElement);
    });
}

function fetchWeeklyForecast(lat, lon) {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`)
        .then(response => response.json())
        .then(data => {
            if (data.daily) {
                updateWeeklyForecast(data.daily);
            } else {
                alert("Fehlerhafte Antwort bei der täglichen Vorhersage:", data);
            }
        })
        .catch(error => alert("Fehler beim Abrufen der wöchentlichen Vorhersage:", error));
}
  
function updateWeeklyForecast(dailyForecast) {
    const forecastDiv = document.getElementById("forecast");
    forecastDiv.innerHTML = "";

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const filteredForecast = dailyForecast.time.filter((date) => {
        const forecastDate = new Date(date);
        forecastDate.setHours(0, 0, 0, 0);
        return forecastDate > currentDate;
    });

    filteredForecast.forEach((date, index) => {
        const maxTemp = dailyForecast.temperature_2m_max[index];
        const minTemp = dailyForecast.temperature_2m_min[index];
        const precipitation = dailyForecast.precipitation_sum[index];

        const dayDiv = document.createElement("div");
        dayDiv.innerHTML = `
            <p>${new Date(date).toLocaleDateString()}</p>
            <p>Max Temp: ${Math.round(maxTemp)}°C</p>
            <p>Min Temp: ${Math.round(minTemp)}°C</p>
            <p>Precipitation: ${precipitation} mm</p>
        `;
        forecastDiv.appendChild(dayDiv);
    });
}

window.onload = getUserLocation;