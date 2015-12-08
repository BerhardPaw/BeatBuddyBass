module.exports = {
	config :  {
		"drumMap": {
			"rockDrumsWithBass": {
				"bassTranspose": 36, // 3 Octaves (3*12)
				"drums" : {
					"36": 35, 	// KickDrum: [35,36]
								// CrossStick: 37 
					"40": 38,	// Snare: [38,40] 
								// HandClaps: 39 
								// TomFloor4: 41
								// HiHatsClosed: 42
								// TomLow3: 43
								// FootHiHat: 44
					"47": 45,	// TomHiMid2: [45, 47]
								// HiHatOpen: 46
					"50": 48, 	// TomHigh1: [48, 50]
					"55": 49,	// ChrashCymbal1: [49, 55, 57, 58]
					"57": 49,
					"58": 49,
					"52": 51, 	// RideCymbal: [51, 52, 59]
					"59": 51,
					"54": 53, 	// RideBell: [53, 54, 56]
					"56": 53
				}
			}
		},
		"zeroTrack": {
			"tempo": {
						"deltaTime": 0,
						"type": "meta",
						"subtype": "setTempo",
						"microsecondsPerBeat": 555554
					},
			"time": {
						"deltaTime": 0,
						"type": "meta",
						"subtype": "timeSignature",
						"numerator": 4,
						"denominator": 4,
						"metronome": 24,
						"thirtyseconds": 8
					},
			"endOfTrack": {
						"deltaTime": 0,
						"type": "meta",
						"subtype": "endOfTrack"
					}
		},
		"directory": {
			"inputPath"	: "../examples/midiFilesIn",
			"outputPath": "../examples/beatBuddyMidi",
			"jsonPath"	: "../examples/jsonFiles"
		}
	}
};

