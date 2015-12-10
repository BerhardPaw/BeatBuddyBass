# BeatBuddyBass - ALPHA version

Generates BeatBuddy midi files for the BeatBuddy "Rock with Bass Drum Kit" based on standard midi files with Markers indicating what parts to use.

Features
---------

This program generates midi files for the BeatBuddy pedal.   

The input files are standard midi files that are marked up in a sequencer.

Currently this has only been tested on a few Cubase 8 midi files where each sections to be extracted are indicated using a named start midi-marker and an end marker! 

Cubase saves these markers in a separate marker track called "Markers" and this program extracts parts of the midi file based on these markers:

* Sections are named according to the named marker and midi drums and bass notes are extracted until the next named or unnamed midi-marker 

* The Drum tracks are extracted and notes are aligned with the BeatBuddy "Rock with Bass Drum Kit" drum map (see the configuration below)

* A Bass track with a name starting with "BASS" is also supported. The bass notes are transposed to fit the bass node samples in the "Rock with Bass Drum Kit" drumkit

The timing is also aligned within each of these new extracted midi files.  

Sample files can be found in (see the configuration below):

```javascript
"directory": {
			"inputPath"	: "examples/midiFilesIn",
			"outputPath": "examples/beatBuddyMidi",
			"jsonPath"	: "examples/jsonFiles"
		}
```

The "inputPath" holds the full midi input files. Open one or more of these files in a sequencer to see the sections are indicated using midi markers.

The "outputPath" holds the BeatBuddy midi output files that can be used with the BBManager. 

The "jsonPath" holds the intermediate JSON files used to generate the midi.

Installation
-------------

    $ npm install beatbuddybass

This module generates midi files and is intended for with Node.

Usage
---------

Write a javascript like this:

```javascript
var bbBass = require('beatbuddybass');
//
// Save output in C:\Temp on Windows
//
var isWin = /^win/.test(process.platform);
if ( isWin ) {
	bbBass.setOutputPath("C:/Temp");
}
//
// Calling with multiple input midifiles
//
var midiFiles = ["Crossroads.mid", "KeyTTHighway.mid", "UnderMyThumb.mid"  ];
bbBass.createMidi( midiFiles);
//
// Or calling with a single file and an Option object
//
bbBass.createMidi("highwayChords.mid", { verbose: true } ) ;
```

You can specify other options like bass and drums channel the createMidi() function, i.e.:

```javascript
bbBass.createMidi( "YourMidiFile.mid", { bassCh: 4, drumsCh: 10, bassTranspose: 2 } );
```
For the bass channel and the drums channel you should provide the channel numbers shown in you sequencer.
The bassTranspose can be used to transpose the bass, but be aware that you bass notes must fit within the 2 octaves available within the
"Rock with Bass Drum Kit", both before and after you transpose it.


Configuration
---------

The program comes with a configuration file, config.js, that defines the BeatBuddy rockDrumsWithBass drum map plus a template 
for the midi zero track to be added to each generated midi file and the directory paths, relative or absolute, for the input and output directories:

```javascript
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
```

