# Weather Helper

General plan:

- Stand up a quick front end to render weather data
- Wire up loading a sample set of JSON from public
- Wire up the API calls to Visual Crossing

UX table stakes:

- Need the day picker (day of week) -- will require logic to determine closest dates and get weather data
- Need to pick a time of day (morning, afternoon, evening)
- Need to enter location

Capture user preferences:

- Ideal temperature
- Ideal humidity
- Tolerance for rain

Play with various ways of showing user preferences:

- Good/bad for each measure (show a shaded region along with the metric)
- Show shading during the time of interest - likely want to show wider view if doing charts (temp doesn't change quickly)

General UI that needs built:

- Charting interface
- Weather data <> icons

Sample URL: <https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/70601?unitGroup=us&key={key}&contentType=json>

Query builder: <https://www.visualcrossing.com/weather-query-builder/#>
