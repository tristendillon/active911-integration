package models

type WeatherAlert struct {
	Event       string `json:"event"`
	Headline    string `json:"headline"`
	Ends        string `json:"ends"`
	EndsEpoch   int64  `json:"endsEpoch"`
	Onset       string `json:"onset"`
	OnsetEpoch  int64  `json:"onsetEpoch"`
	ID          string `json:"id"`
	Language    string `json:"language"`
	Link        string `json:"link"`
	Description string `json:"description"`
}

type WeatherHour struct {
	Conditions string  `json:"conditions"`
	Datetime   string  `json:"datetime"`
	Humidity   float64 `json:"humidity"`
	Icon       string  `json:"icon"`
	Precipprob float64 `json:"precipprob"`
	Temp       float64 `json:"temp"`
	Winddir    float64 `json:"winddir"`
	Windspeed  float64 `json:"windspeed"`
}

type WeatherDay struct {
	Datetime    string        `json:"datetime"`
	Conditions  string        `json:"conditions"`
	Description string        `json:"description"`
	Hours       []WeatherHour `json:"hours"`
	Humidity    float64       `json:"humidity"`
	Icon        string        `json:"icon"`
	Precipprob  float64       `json:"precipprob"`
	Temp        float64       `json:"temp"`
	Tempmax     float64       `json:"tempmax"`
	Tempmin     float64       `json:"tempmin"`
	Winddir     float64       `json:"winddir"`
	Windspeed   float64       `json:"windspeed"`
}

type Weather struct {
	ID                string        `json:"id"`
	Address           string        `json:"address"`
	ResolvedAddress   string        `json:"resolvedAddress"`
	CurrentConditions WeatherHour   `json:"currentConditions"`
	Latitude          float64       `json:"latitude"`
	Longitude         float64       `json:"longitude"`
	Timezone          string        `json:"timezone"`
	Tzoffset          float64       `json:"tzoffset"`
	Days              []WeatherDay  `json:"days"`
	Alerts            []WeatherAlert `json:"alerts"`
	LastUpdated       int64         `json:"lastUpdated"`
}