package auth

import (
	"context"
	"errors"
	"net/http"
	"reflect"
	"regexp"
	"strings"

	"github.com/user/alerting/server/internal/logging"
	"github.com/user/alerting/server/internal/models"
)

// Common errors
var (
	ErrUnauthorized = errors.New("unauthorized: invalid API password")
)

// AuthKey is the context key for authentication info
type AuthKey string

// Context keys
const (
	AuthInfoKey AuthKey = "auth_info"
)

// AuthInfo contains authentication information
type AuthInfo struct {
	Authenticated bool
	Password      string
}

// Authenticator handles authentication
type Authenticator struct {
	apiPassword string
	logger      *logging.Logger
}

// New creates a new Authenticator
func New(apiPassword string, logger *logging.Logger) *Authenticator {
	return &Authenticator{
		apiPassword: apiPassword,
		logger:      logger,
	}
}

// Authenticate checks the API password
func (a *Authenticator) Authenticate(password string) (bool, error) {
	if a.apiPassword == "" {
		// If no password is set, authentication is bypassed
		a.logger.Info("No API password configured - authentication bypass enabled")
		return true, nil
	}

	a.logger.Infof("Authenticating request - API password configured: %v, password provided: %v",
		a.apiPassword != "", password != "")

	if password != a.apiPassword {
		a.logger.Info("Authentication failed - incorrect password provided")
		return false, ErrUnauthorized
	}

	a.logger.Info("Authentication successful")
	return true, nil
}

// GetAuthInfo extracts authentication info from a request
func (a *Authenticator) GetAuthInfo(r *http.Request) AuthInfo {
	// Check query parameter first
	password := r.URL.Query().Get("password")
	a.logger.Infof("Auth check - Query param password present: %v", password != "")

	// If empty, check Authorization header
	if password == "" {
		authHeader := r.Header.Get("Authorization")
		a.logger.Infof("Auth check - Authorization header present: %v", authHeader != "")
		if strings.HasPrefix(authHeader, "Bearer ") {
			password = strings.TrimPrefix(authHeader, "Bearer ")
			a.logger.Infof("Auth check - Bearer token extracted")
		}
	}

	// Check if password is valid
	isAuthenticated, err := a.Authenticate(password)
	if err != nil {
		a.logger.Error(err, "Error authenticating request")
		isAuthenticated = false
	}

	a.logger.Infof("Auth check complete - Password provided: %v, Authenticated: %v",
		password != "", isAuthenticated)

	return AuthInfo{
		Authenticated: isAuthenticated,
		Password:      password,
	}
}

// GetAuthInfoFromContext gets authentication info from context
func GetAuthInfoFromContext(ctx context.Context) (AuthInfo, bool) {
	if authInfo, ok := ctx.Value(AuthInfoKey).(AuthInfo); ok {
		return authInfo, true
	}
	return AuthInfo{}, false
}

// RedactionLevel defines the level of redaction to apply
type RedactionLevel int

const (
	// NormalRedaction redacts always redacted fields only
	NormalRedaction RedactionLevel = iota
	// PartialRedaction redacts more fields, primarily location data
	PartialRedaction
	// FullRedaction redacts the entire alert other than timestamp and ID
	FullRedaction
)

var alwaysRedactedFields = []string{
	"Details",
}

// Additional fields to redact in partial redaction mode
var partialRedactedFields = []string{
	"CrossStreet",
	"MapAddress",
	"Place",
	"DispatchCoords",
	"City",
	"State",
	"CoordinateSource",
	"Lat",
	"Lon",
}

// Fields to preserve in full redaction mode (everything else is redacted)
var preservedFieldsInFullRedaction = []string{
	"ID",
	"Stamp",
	"Status",
}

type DescriptorRedaction struct {
	Key   string
	Level RedactionLevel
}

var primaryRedaction = []DescriptorRedaction{
	{
		Key:   "abandonedveh",
		Level: PartialRedaction,
	},
	{
		Key:   "accidentinjury",
		Level: PartialRedaction,
	},
	{
		Key:   "accidentnoninj",
		Level: NormalRedaction,
	},
	{
		Key:   "accidentpast",
		Level: FullRedaction,
	},
	{
		Key:   "activeviolence",
		Level: FullRedaction,
	},
	{
		Key:   "alarmbusiness",
		Level: PartialRedaction,
	},
	{
		Key:   "alarmfire",
		Level: NormalRedaction,
	},
	{
		Key:   "alarmresidenti",
		Level: PartialRedaction,
	},
	{
		Key:   "alchmipmic",
		Level: FullRedaction,
	},
	{
		Key:   "alchopenont",
		Level: FullRedaction,
	},
	{
		Key:   "alchtransport",
		Level: FullRedaction,
	},
	{
		Key:   "animalatlarge",
		Level: PartialRedaction,
	},
	{
		Key:   "animalbarking",
		Level: PartialRedaction,
	},
	{
		Key:   "animalbite",
		Level: PartialRedaction,
	},
	{
		Key:   "animalconfined",
		Level: PartialRedaction,
	},
	{
		Key:   "animaldeceased",
		Level: PartialRedaction,
	},
	{
		Key:   "animallost",
		Level: PartialRedaction,
	},
	{
		Key:   "animalother",
		Level: PartialRedaction,
	},
	{
		Key:   "animalvicious",
		Level: PartialRedaction,
	},
	{
		Key:   "animalwelfare",
		Level: PartialRedaction,
	},
	{
		Key:   "arrest",
		Level: FullRedaction,
	},
	{
		Key:   "arson",
		Level: FullRedaction,
	},
	{
		Key:   "arsonpast",
		Level: FullRedaction,
	},
	{
		Key:   "assault",
		Level: FullRedaction,
	},
	{
		Key:   "assaultip",
		Level: FullRedaction,
	},
	{
		Key:   "assaultpast",
		Level: FullRedaction,
	},
	{
		Key:   "assistcorespo",
		Level: FullRedaction,
	},
	{
		Key:   "assistk9",
		Level: PartialRedaction,
	},
	{
		Key:   "assistoj",
		Level: PartialRedaction,
	},
	{
		Key:   "assistptso",
		Level: PartialRedaction,
	},
	{
		Key:   "atlperson",
		Level: PartialRedaction,
	},
	{
		Key:   "atlvehicle",
		Level: PartialRedaction,
	},
	{
		Key:   "barcheck",
		Level: PartialRedaction,
	},
	{
		Key:   "battery",
		Level: FullRedaction,
	},
	{
		Key:   "batteryip",
		Level: FullRedaction,
	},
	{
		Key:   "batterypast",
		Level: FullRedaction,
	},
	{
		Key:   "blackmailextor",
		Level: FullRedaction,
	},
	{
		Key:   "bombthrt",
		Level: FullRedaction,
	},
	{
		Key:   "bribery",
		Level: FullRedaction,
	},
	{
		Key:   "burglary",
		Level: FullRedaction,
	},
	{
		Key:   "burglaryip",
		Level: FullRedaction,
	},
	{
		Key:   "burglarypast",
		Level: FullRedaction,
	},
	{
		Key:   "cdp",
		Level: FullRedaction,
	},
	{
		Key:   "cdppast",
		Level: FullRedaction,
	},
	{
		Key:   "childabuse",
		Level: FullRedaction,
	},
	{
		Key:   "childseat",
		Level: FullRedaction,
	},
	{
		Key:   "codeviolation",
		Level: NormalRedaction,
	},
	{
		Key:   "communitypres",
		Level: PartialRedaction,
	},
	{
		Key:   "contchildmisc",
		Level: FullRedaction,
	},
	{
		Key:   "criminalthreat",
		Level: FullRedaction,
	},
	{
		Key:   "criminalrestra",
		Level: PartialRedaction,
	},
	{
		Key:   "curfewloiterng",
		Level: PartialRedaction,
	},
	{
		Key:   "delivermessage",
		Level: PartialRedaction,
	},
	{
		Key:   "deprivation",
		Level: PartialRedaction,
	},
	{
		Key:   "disabledveh",
		Level: NormalRedaction,
	},
	{
		Key:   "disordconduct",
		Level: FullRedaction,
	},
	{
		Key:   "disorderlyhous",
		Level: PartialRedaction,
	},
	{
		Key:   "distpeacnoise",
		Level: PartialRedaction,
	},
	{
		Key:   "domestic",
		Level: FullRedaction,
	},
	{
		Key:   "domesticip",
		Level: FullRedaction,
	},
	{
		Key:   "domesticpast",
		Level: FullRedaction,
	},
	{
		Key:   "drugs",
		Level: FullRedaction,
	},
	{
		Key:   "duialcordrug",
		Level: FullRedaction,
	},
	{
		Key:   "eavesdropping",
		Level: FullRedaction,
	},
	{
		Key:   "embezzlement",
		Level: FullRedaction,
	},
	{
		Key:   "escapecust",
		Level: FullRedaction,
	},
	{
		Key:   "escapecustwr",
		Level: FullRedaction,
	},
	{
		Key:   "escort",
		Level: PartialRedaction,
	},
	{
		Key:   "evidence",
		Level: FullRedaction,
	},
	{
		Key:   "explosives",
		Level: PartialRedaction,
	},
	{
		Key:   "extrapatrol",
		Level: PartialRedaction,
	},
	{
		Key:   "falseimperson",
		Level: PartialRedaction,
	},
	{
		Key:   "familyother",
		Level: FullRedaction,
	},
	{
		Key:   "fileaflserpt",
		Level: FullRedaction,
	},
	{
		Key:   "fire",
		Level: NormalRedaction,
	},
	{
		Key:   "fireacceptance",
		Level: NormalRedaction,
	},
	{
		Key:   "fireaircraft",
		Level: NormalRedaction,
	},
	{
		Key:   "fireadvisory",
		Level: NormalRedaction,
	},
	{
		Key:   "fireassist",
		Level: NormalRedaction,
	},
	{
		Key:   "firebackrescu",
		Level: NormalRedaction,
	},
	{
		Key:   "fireconfined",
		Level: NormalRedaction,
	},
	{
		Key:   "firedrli",
		Level: NormalRedaction,
	},
	{
		Key:   "firedrll",
		Level: NormalRedaction,
	},
	{
		Key:   "fireelectrical",
		Level: NormalRedaction,
	},
	{
		Key:   "fireelevator",
		Level: NormalRedaction,
	},
	{
		Key:   "fireexplosion",
		Level: NormalRedaction,
	},
	{
		Key:   "fireextricatio",
		Level: NormalRedaction,
	},
	{
		Key:   "firefuelspill",
		Level: NormalRedaction,
	},
	{
		Key:   "firegasleak",
		Level: NormalRedaction,
	},
	{
		Key:   "firegrassbrus",
		Level: NormalRedaction,
	},
	{
		Key:   "firehazmat",
		Level: NormalRedaction,
	},
	{
		Key:   "firehighangle",
		Level: NormalRedaction,
	},
	{
		Key:   "firelightning",
		Level: NormalRedaction,
	},
	{
		Key:   "firelostperso",
		Level: PartialRedaction,
	},
	{
		Key:   "firemarine",
		Level: NormalRedaction,
	},
	{
		Key:   "firemutualaid",
		Level: NormalRedaction,
	},
	{
		Key:   "fireodor",
		Level: NormalRedaction,
	},
	{
		Key:   "fireoutside",
		Level: NormalRedaction,
	},
	{
		Key:   "fireovercrowd",
		Level: NormalRedaction,
	},
	{
		Key:   "firepkgbomb",
		Level: NormalRedaction,
	},
	{
		Key:   "firepr",
		Level: NormalRedaction,
	},
	{
		Key:   "firesinkeh",
		Level: NormalRedaction,
	},
	{
		Key:   "firesinkeh",
		Level: NormalRedaction,
	},
	{
		Key:   "firesmoke",
		Level: NormalRedaction,
	},
	{
		Key:   "firestandby",
		Level: NormalRedaction,
	},
	{
		Key:   "firestructure",
		Level: NormalRedaction,
	},
	{
		Key:   "firetankoutsi",
		Level: NormalRedaction,
	},
	{
		Key:   "firetrainfire",
		Level: NormalRedaction,
	},
	{
		Key:   "firetraininci",
		Level: NormalRedaction,
	},
	{
		Key:   "firevehicle",
		Level: NormalRedaction,
	},
	{
		Key:   "firewatercraft",
		Level: NormalRedaction,
	},
	{
		Key:   "fireweathisa",
		Level: NormalRedaction,
	},
	{
		Key:   "fireworks",
		Level: NormalRedaction,
	},
	{
		Key:   "firewtrrescue",
		Level: NormalRedaction,
	},
	{
		Key:   "fishgame",
		Level: PartialRedaction,
	},
	{
		Key:   "fightip",
		Level: FullRedaction,
	},
	{
		Key:   "fightpast",
		Level: FullRedaction,
	},
	{
		Key:   "fleeelude",
		Level: FullRedaction,
	},
	{
		Key:   "flooding",
		Level: NormalRedaction,
	},
	{
		Key:   "footpursuit",
		Level: FullRedaction,
	},
	{
		Key:   "forgery",
		Level: FullRedaction,
	},
	{
		Key:   "foundproperty",
		Level: PartialRedaction,
	},
	{
		Key:   "fraud",
		Level: FullRedaction,
	},
	{
		Key:   "furntominors",
		Level: FullRedaction,
	},
	{
		Key:   "gambling",
		Level: FullRedaction,
	},
	{
		Key:   "homicide",
		Level: FullRedaction,
	},
	{
		Key:   "housecheck",
		Level: PartialRedaction,
	},
	{
		Key:   "humantrafficki",
		Level: FullRedaction,
	},
	{
		Key:   "incest",
		Level: FullRedaction,
	},
	{
		Key:   "information",
		Level: PartialRedaction,
	},
	{
		Key:   "intimidation",
		Level: FullRedaction,
	},
	{
		Key:   "interwchild",
		Level: FullRedaction,
	},
	{
		Key:   "investigatehzd",
		Level: PartialRedaction,
	},
	{
		Key:   "investigateveh",
		Level: FullRedaction,
	},
	{
		Key:   "investreport",
		Level: PartialRedaction,
	},
	{
		Key:   "juvenileproblm",
		Level: NormalRedaction,
	},
	{
		Key:   "juveniletransp",
		Level: FullRedaction,
	},
	{
		Key:   "juvcincoher",
		Level: FullRedaction,
	},
	{
		Key:   "juvcincrunawy",
		Level: FullRedaction,
	},
	{
		Key:   "kidnapping",
		Level: FullRedaction,
	},
	{
		Key:   "kidnappingip",
		Level: FullRedaction,
	},
	{
		Key:   "larceny",
		Level: FullRedaction,
	},
	{
		Key:   "larcenyeh",
		Level: FullRedaction,
	},
	{
		Key:   "larcenyehpast",
		Level: FullRedaction,
	},
	{
		Key:   "larcenypast",
		Level: FullRedaction,
	},
	{
		Key:   "lewdlascivious",
		Level: FullRedaction,
	},
	{
		Key:   "liqlawsother",
		Level: FullRedaction,
	},
	{
		Key:   "littering",
		Level: PartialRedaction,
	},
	{
		Key:   "lostproperty",
		Level: PartialRedaction,
	},
	{
		Key:   "medabdominal",
		Level: PartialRedaction,
	},
	{
		Key:   "medacn",
		Level: PartialRedaction,
	},
	{
		Key:   "medalergbites",
		Level: PartialRedaction,
	},
	{
		Key:   "medanimalbite",
		Level: PartialRedaction,
	},
	{
		Key:   "medassault",
		Level: PartialRedaction,
	},
	{
		Key:   "medbackpain",
		Level: PartialRedaction,
	},
	{
		Key:   "medbreathing",
		Level: PartialRedaction,
	},
	{
		Key:   "medburnexplos",
		Level: PartialRedaction,
	},
	{
		Key:   "medcardiacres",
		Level: PartialRedaction,
	},
	{
		Key:   "medchestpain",
		Level: PartialRedaction,
	},
	{
		Key:   "medchoking",
		Level: PartialRedaction,
	},
	{
		Key:   "medcrbnmonoxd",
		Level: PartialRedaction,
	},
	{
		Key:   "meddiabetic",
		Level: PartialRedaction,
	},
	{
		Key:   "meddrowning",
		Level: PartialRedaction,
	},
	{
		Key:   "medelectro",
		Level: PartialRedaction,
	},
	{
		Key:   "medeyeproblem",
		Level: PartialRedaction,
	},
	{
		Key:   "medfall",
		Level: PartialRedaction,
	},
	{
		Key:   "medflight",
		Level: PartialRedaction,
	},
	{
		Key:   "medheadache",
		Level: PartialRedaction,
	},
	{
		Key:   "medheartprob",
		Level: PartialRedaction,
	},
	{
		Key:   "medheatcold",
		Level: PartialRedaction,
	},
	{
		Key:   "medhemorrhage",
		Level: PartialRedaction,
	},
	{
		Key:   "medliftassist",
		Level: PartialRedaction,
	},
	{
		Key:   "medobstetrical",
		Level: PartialRedaction,
	},
	{
		Key:   "medoj",
		Level: PartialRedaction,
	},
	{
		Key:   "medotrentrap",
		Level: FullRedaction,
	},
	{
		Key:   "medoverdose",
		Level: FullRedaction,
	},
	{
		Key:   "medpr",
		Level: FullRedaction,
	},
	{
		Key:   "medpsychiatric",
		Level: FullRedaction,
	},
	{
		Key:   "medseizure",
		Level: PartialRedaction,
	},
	{
		Key:   "medsickperson",
		Level: PartialRedaction,
	},
	{
		Key:   "medstabgunsht",
		Level: FullRedaction,
	},
	{
		Key:   "medstandby",
		Level: PartialRedaction,
	},
	{
		Key:   "medstrokecva",
		Level: PartialRedaction,
	},
	{
		Key:   "medtransfer",
		Level: PartialRedaction,
	},
	{
		Key:   "medtraumaoth",
		Level: PartialRedaction,
	},
	{
		Key:   "medunconscious",
		Level: PartialRedaction,
	},
	{
		Key:   "medunknown",
		Level: PartialRedaction,
	},
	{
		Key:   "medicalother",
		Level: PartialRedaction,
	},
	{
		Key:   "mhp",
		Level: FullRedaction,
	},
	{
		Key:   "miscordresol",
		Level: FullRedaction,
	},
	{
		Key:   "missingperson",
		Level: PartialRedaction,
	},
	{
		Key:   "mjreports",
		Level: FullRedaction,
	},
	{
		Key:   "motoristassist",
		Level: PartialRedaction,
	},
	{
		Key:   "obscenity",
		Level: FullRedaction,
	},
	{
		Key:   "offenderregist",
		Level: FullRedaction,
	},
	{
		Key:   "ojreports",
		Level: FullRedaction,
	},
	{
		Key:   "ojwarrants",
		Level: FullRedaction,
	},
	{
		Key:   "othrtrviol",
		Level: FullRedaction,
	},
	{
		Key:   "overcrowding",
		Level: NormalRedaction,
	},
	{
		Key:   "parkingauth",
		Level: PartialRedaction,
	},
	{
		Key:   "parkingproblem",
		Level: PartialRedaction,
	},
	{
		Key:   "pbarctraffic",
		Level: FullRedaction,
	},
	{
		Key:   "pbarc2",
		Level: FullRedaction,
	},
	{
		Key:   "pbburgprevent",
		Level: FullRedaction,
	},
	{
		Key:   "pbcaseofplac",
		Level: FullRedaction,
	},
	{
		Key:   "pbcitizenexch",
		Level: FullRedaction,
	},
	{
		Key:   "pbgeneralplay",
		Level: FullRedaction,
	},
	{
		Key:   "pblaserpoint",
		Level: PartialRedaction,
	},
	{
		Key:   "pblarcmvprev",
		Level: FullRedaction,
	},
	{
		Key:   "pblpr",
		Level: FullRedaction,
	},
	{
		Key:   "pbpreventpart",
		Level: FullRedaction,
	},
	{
		Key:   "pbrepeatoffdr",
		Level: FullRedaction,
	},
	{
		Key:   "pbverkada",
		Level: FullRedaction,
	},
	{
		Key:   "pbwarrant",
		Level: FullRedaction,
	},
	{
		Key:   "perjury",
		Level: PartialRedaction,
	},
	{
		Key:   "phoneharrasmnt",
		Level: FullRedaction,
	},
	{
		Key:   "prostitution",
		Level: FullRedaction,
	},
	{
		Key:   "protectcustody",
		Level: PartialRedaction,
	},
	{
		Key:   "publiccontact",
		Level: PartialRedaction,
	},
	{
		Key:   "publicinjury",
		Level: PartialRedaction,
	},
	{
		Key:   "publicservice",
		Level: PartialRedaction,
	},
	{
		Key:   "rape",
		Level: FullRedaction,
	},
	{
		Key:   "rapeip",
		Level: FullRedaction,
	},
	{
		Key:   "rapepast",
		Level: FullRedaction,
	},
	{
		Key:   "recklessdrive",
		Level: FullRedaction,
	},
	{
		Key:   "recoveredprop",
		Level: PartialRedaction,
	},
	{
		Key:   "repossesedprop",
		Level: PartialRedaction,
	},
	{
		Key:   "resisting",
		Level: PartialRedaction,
	},
	{
		Key:   "riotulawasbly",
		Level: FullRedaction,
	},
	{
		Key:   "robbery",
		Level: FullRedaction,
	},
	{
		Key:   "robberyip",
		Level: FullRedaction,
	},
	{
		Key:   "robberypast",
		Level: FullRedaction,
	},
	{
		Key:   "searchwarrant",
		Level: PartialRedaction,
	},
	{
		Key:   "sexoffense",
		Level: FullRedaction,
	},
	{
		Key:   "shotsfired",
		Level: FullRedaction,
	},
	{
		Key:   "shotsheard",
		Level: FullRedaction,
	},
	{
		Key:   "smokingviol",
		Level: FullRedaction,
	},
	{
		Key:   "speakwaw",
		Level: PartialRedaction,
	},
	{
		Key:   "speakwcalltk",
		Level: FullRedaction,
	},
	{
		Key:   "speakwofc",
		Level: FullRedaction,
	},
	{
		Key:   "stalking",
		Level: FullRedaction,
	},
	{
		Key:   "standby",
		Level: PartialRedaction,
	},
	{
		Key:   "stolenproperty",
		Level: FullRedaction,
	},
	{
		Key:   "stolenveh",
		Level: FullRedaction,
	},
	{
		Key:   "stolenvehpast",
		Level: FullRedaction,
	},
	{
		Key:   "suicide",
		Level: FullRedaction,
	},
	{
		Key:   "supplement",
		Level: PartialRedaction,
	},
	{
		Key:   "suspicion",
		Level: PartialRedaction,
	},
	{
		Key:   "suscancrevdl",
		Level: FullRedaction,
	},
	{
		Key:   "testingcall",
		Level: PartialRedaction,
	},
	{
		Key:   "tobaccoproblem",
		Level: PartialRedaction,
	},
	{
		Key:   "tow",
		Level: PartialRedaction,
	},
	{
		Key:   "trafficadvisry",
		Level: PartialRedaction,
	},
	{
		Key:   "traffichazard",
		Level: NormalRedaction,
	},
	{
		Key:   "trafficstop",
		Level: FullRedaction,
	},
	{
		Key:   "transport",
		Level: FullRedaction,
	},
	{
		Key:   "trespass",
		Level: FullRedaction,
	},
	{
		Key:   "trfdevmalf",
		Level: PartialRedaction,
	},
	{
		Key:   "trfdvcmissing",
		Level: PartialRedaction,
	},
	{
		Key:   "unatendeeath",
		Level: FullRedaction,
	},
	{
		Key:   "unlawusedlid",
		Level: FullRedaction,
	},
	{
		Key:   "unwantedsubj",
		Level: PartialRedaction,
	},
	{
		Key:   "unsecurepremis",
		Level: PartialRedaction,
	},
	{
		Key:   "urinateinpub",
		Level: PartialRedaction,
	},
	{
		Key:   "utilityproblem",
		Level: PartialRedaction,
	},
	{
		Key:   "vehhomicide",
		Level: FullRedaction,
	},
	{
		Key:   "verbalargument",
		Level: FullRedaction,
	},
	{
		Key:   "violcrtorder",
		Level: FullRedaction,
	},
	{
		Key:   "warrant",
		Level: FullRedaction,
	},
	{
		Key:   "wateremergency",
		Level: PartialRedaction,
	},
	{
		Key:   "weaponviol",
		Level: FullRedaction,
	},
	{
		Key:   "welfarecheck",
		Level: PartialRedaction,
	},
	{
		Key:   "windowpeeping",
		Level: FullRedaction,
	},
	{
		Key:   "wpncontjail",
		Level: FullRedaction,
	},
	{
		Key:   "48hrsanction",
		Level: PartialRedaction,
	},
}

var secondaryRedaction = []DescriptorRedaction{
	{
		Key:   "med",
		Level: PartialRedaction,
	},
}

func RedactAlertData(alert *models.Alert) *models.Alert {
	descriptor := alert.Alert.Description
	level := determineRedactionLevel(*descriptor)
	return RedactAlertDataWithLevel(alert, level)
}

func determineRedactionLevel(descriptor string) RedactionLevel {
	// Default to normal redaction if no match is found
	level := NormalRedaction

	// Clean the descriptor: lowercase and remove non-alphanumeric characters
	clean := cleanDescriptor(descriptor)
	// Look for a matching descriptor in our redaction mappings
	for _, dr := range primaryRedaction {
		if dr.Key == clean {
			level = dr.Level
			break
		}
	}

	if level != NormalRedaction {
		return level
	}

	// Second pass for contain strings which is secondary check.
	for _, dr := range secondaryRedaction {
		if strings.Contains(clean, dr.Key) {
			level = dr.Level
			break
		}
	}

	return level
}

func cleanDescriptor(descriptor string) string {
	// Convert to lowercase
	result := strings.ToLower(descriptor)

	// Remove all non-alphanumeric characters
	reg := regexp.MustCompile(`[^a-zA-Z0-9]`)
	result = reg.ReplaceAllString(result, "")

	return result
}

// RedactAlertDataWithLevel applies redaction to an alert based on the specified redaction level
func RedactAlertDataWithLevel(alert *models.Alert, level RedactionLevel) *models.Alert {
	// Create a deep copy of the alert to avoid modifying the original
	redactedAlert := *alert // Copy the top level struct

	// Prepare the reflection to access fields
	alertValue := reflect.ValueOf(&redactedAlert.Alert).Elem()

	// Apply redaction based on level
	switch level {
	case NormalRedaction:
		// Only redact always redacted fields
		redactFields(alertValue, alwaysRedactedFields)

	case PartialRedaction:
		// Redact always redacted fields
		redactFields(alertValue, alwaysRedactedFields)
		// Redact additional location fields
		redactFields(alertValue, partialRedactedFields)

	case FullRedaction:
		// Redact everything except preserved fields
		// Get all field names using reflection
		alertType := alertValue.Type()
		fieldCount := alertType.NumField()

		for i := 0; i < fieldCount; i++ {
			fieldName := alertType.Field(i).Name

			// Skip preserved fields
			if contains(preservedFieldsInFullRedaction, fieldName) {
				continue
			}

			fieldValue := alertValue.FieldByName(fieldName)
			if fieldValue.IsValid() && fieldValue.CanSet() {
				redactField(fieldValue)
			}
		}

		// Always redact coordinates in full redaction mode
		redactedAlert.Alert.Lat = 0
		redactedAlert.Alert.Lon = 0
	}

	return &redactedAlert
}

// redactFields applies redaction to the specified fields
func redactFields(alertValue reflect.Value, fields []string) {
	for _, field := range fields {
		fieldValue := alertValue.FieldByName(field)
		if fieldValue.IsValid() && fieldValue.CanSet() {
			redactField(fieldValue)
		}
	}
}

// redactField redacts a single field based on its type
func redactField(fieldValue reflect.Value) {
	switch fieldValue.Kind() {
	case reflect.String:
		fieldValue.SetString("[Redacted]")
	case reflect.Ptr:
		// Handle string pointers
		if !fieldValue.IsNil() && fieldValue.Elem().Kind() == reflect.String {
			fieldValue.Elem().SetString("[Redacted]")
		}
	case reflect.Float64:
		fieldValue.SetFloat(0)
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		fieldValue.SetInt(0)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		fieldValue.SetUint(0)
	case reflect.Bool:
		fieldValue.SetBool(false)
	case reflect.Slice:
		// Clear slices
		fieldValue.Set(reflect.Zero(fieldValue.Type()))
	}
}

// contains checks if a string is in a slice
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Auth middleware adds authentication info to the request context
func (a *Authenticator) Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get authentication info
		authInfo := a.GetAuthInfo(r)

		// Set authentication info in context
		ctx := context.WithValue(r.Context(), AuthInfoKey, authInfo)
		a.logger.Infof("Authentication info: %+v", authInfo)
		// Call the next handler with the updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
