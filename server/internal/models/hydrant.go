package models

// Hydrant represents a fire hydrant
type Hydrant struct {
	ID          string  `json:"id"`
	Type        string  `json:"type,omitempty"`
	Nozzles     int     `json:"nozzles,omitempty"`
	FlowRate    float64 `json:"flow_rate,omitempty"`
	Color       string  `json:"color,omitempty"` // red, orange, green, blue
	Status      string  `json:"status,omitempty"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	FlowStatus  string  `json:"flow_status,omitempty"`
	CreatedAt   float64 `json:"created_at,omitempty"`
	UpdatedAt   float64 `json:"updated_at,omitempty"`
}

// HydrantBatchUploadProgress represents the progress of a batch upload
type HydrantBatchUploadProgress struct {
	Total       int     `json:"total"`
	Processed   int     `json:"processed"`
	Successful  int     `json:"successful"`
	Failed      int     `json:"failed"`
	Progress    float64 `json:"progress"` // Percentage 0-100
	InProgress  bool    `json:"in_progress"`
	FailedItems []struct {
		Index int    `json:"index"`
		Error string `json:"error"`
	} `json:"failed_items,omitempty"`
}

// HydrantBoundsQuery represents the geographic bounds for querying hydrants
type HydrantBoundsQuery struct {
	NorthLat float64 `json:"north_lat"`
	SouthLat float64 `json:"south_lat"`
	EastLng  float64 `json:"east_lng"`
	WestLng  float64 `json:"west_lng"`
}