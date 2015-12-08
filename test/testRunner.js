var bbBass = require('../lib/beatbuddybass.js');
var midiFiles = ["Crossroads.mid", "KeyTTHighway.mid", "UnderMyThumb.mid"  ];
bbBass.createMidi( midiFiles);
var isWin = /^win/.test(process.platform);
if ( isWin ) {
	bbBass.setOutputPath("C:/Temp");
}
bbBass.createMidi("highwayChords.mid", { verbose: true } ) ;