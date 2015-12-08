var fs = require('fs'),
	path = require('path'), 
	midiConverter = require('midi-converter'),
	_ = require('underscore'),
	jp = require('jsonpath'),
	cf = require('./config.js');

module.exports = {
  	TICKS_PER_BEAT   : 128,
  	// fileList		 : [],
	progressCounter  : 1,
	debug            : false, // set to true for some debug information to console
	verbose          : true,
	dirname			 : __dirname,
	
	progress: function(txt) { 
		if ( this.debug ) {
			console.log("Progress:" + this.progressCounter  +  " " + ( ! _.isUndefined(txt) ? " => " + txt : "" ) );
			this.progressCounter++;	
		}
		else if ( this.verbose && txt.match(/(^READ|WRITE)\s*:.*/) ) {
			console.log(txt);
		}
	},  
	//
	//
	setOutputPath: function(dirPath) {
		try {
			var stats = fs.lstatSync( dirPath );
			if ( stats.isDirectory() ) {
				cf.config.directory.outputPath = dirPath;
			}
		}
		catch (e) {
			throw Error("Output Directory:" + dirPath + " is not a directory");
		}
	},
    //
	//
	setInputPath: function(dirPath) {
		try {
			var stats = fs.lstatSync( dirPath );
			if ( stats.isDirectory() ) {
				cf.config.directory.inputPath = dirPath;
			}
		}
		catch (e) {
			throw Error("Input Directory:" + dirPath + " is not a directory");
		}
	},
	//
	//
	getFullFilePath: function( _filePath, prefix, pass ) {
	    pass = _.isUndefined( pass) ? 0 : pass;
		var filePath = path.normalize(_filePath);
		try {
			var stats = fs.lstatSync( filePath );
			if ( stats.isFile() || stats.isDirectory() ) {
				return filePath;
			}
		}
		catch (e) {
			if (  pass === 0   ) {	// absolute path			
				var extendedPath  = prefix + "/" + filePath;
				return this.getFullFilePath(extendedPath, prefix, 1);		
			}
			else if ( pass === 1 ) { // Relative path  
				extendedPath  = this.dirname  + "/" + filePath;
				return this.getFullFilePath(extendedPath, prefix,  2);	
			}
		    else {
				throw Error ( "Cannot locate File:"  + filePath);
			}
		}
	},
    //
	//
	buildTrackZero : function(song) {
		var timeSig; 
		var timeSignatures = _.sortBy(jp.query(song,"$..[?(@.subtype == 'timeSignature')]"), function(obj) { return obj.deltaTime; });
		if (timeSignatures.length > 0  ) {
			timeSig = timeSignatures[0];
			timeSig.deltaTime = 0;
			timeSig.realTime = 0;
		}
		else {
			timeSig = cf.config.zeroTrack.time;
		}
		// Oversimplified for now - takes the first setTempo
		var tempoSig;
		var tempoSignatures = _.sortBy(jp.query(song,"$..[?(@.subtype == 'setTempo')]"), function(obj) { return obj.deltaTime; });
		if (tempoSignatures.length > 0  ) {
			tempoSig = tempoSignatures[0];
			tempoSig.deltaTime = 0;
			tempoSig.realTime = 0;
			this.progress("setTempo:" + JSON.stringify(tempoSig));
		}
		else {
			tempoSig = cf.config.zeroTrack.tempo;
		}
		var trackZero = [];
		trackZero.push(timeSig, tempoSig, cf.config.zeroTrack.endOfTrack );
		return trackZero;
	},
	//
	//
	writeSongPart : function (marker, song, drumEvents, bassEvents, fileName, opts ) {
		if ( marker.subtype == "marker" && marker.text != "" ) {
			var trackZero = this.buildTrackZero(song);
			var jsonObj  = {}
			jsonObj.header = song.header;
			jsonObj.header.ticksPerBeat = this.TICKS_PER_BEAT;
	
			if ( _.has(opts, "midiFormat") && opts.midiFormat === 0 ) {		
				jsonObj.header.trackCount = 1;
				jsonObj.tracks = _.sortBy(trackZero.concat(drumEvents, bassEvents), function(obj) { return obj.realTime * 1000 + obj.sortKey; });
				jsonObj.tracks.push(cf.config.zeroTrack.endOfTrack);
			}
			else {
				// Assume midi format 1
				jsonObj.header.trackCount = 3;
				drumEvents.push(cf.config.zeroTrack.endOfTrack);
				bassEvents.push(cf.config.zeroTrack.endOfTrack);
				jsonObj.tracks = [trackZero, drumEvents, bassEvents];
			}
	
			var markerFileName = fileName.substr(0, fileName.lastIndexOf('.')) +  "_" + marker.text ;
            var jsonPath = path.normalize(this.getFullFilePath(cf.config.directory.jsonPath) + "/" + markerFileName + ".json");
			fs.writeFileSync( jsonPath , JSON.stringify(jsonObj));
			
			var midiPath = path.normalize(this.getFullFilePath( cf.config.directory.outputPath) + "/" + markerFileName + ".mid");
			var midiSong = midiConverter.jsonToMidi(jsonObj);
			this.progress("WRITE: " + midiPath);
			fs.writeFileSync( midiPath, midiSong, 'binary');
		}
	},
	//
	//
	readSongs : function( opts ) {
		this.progress(JSON.stringify(opts));
		for (var f = 0; f < opts.filePaths.length; f++) {
			var fileName = opts.filePaths[f];
			var fullPath = this.getFullFilePath(fileName, cf.config.directory.inputPath);
			this.progress("READ: " + fullPath);
			var midiSong = fs.readFileSync( fullPath, 'binary');	
			// var midiSong = fs.readFileSync( this.dirname + "/" + cf.config.directory.inputPath + "/" + fileName, 'binary');		
			var song = midiConverter.midiToJson(midiSong);
			//
			// Tick per beat must be normalized to 128 due to jsmidgen constant
			// 
			var ticksPerBeat = song.header.ticksPerBeat;
			var normalize = ticksPerBeat / this.TICKS_PER_BEAT;
			song.header.ticksPerBeat = this.TICKS_PER_BEAT;
			//
			// Write realTime elapsed to the tracks
			//
			var markerTrackNo = -1;
			var bassTrackCh = -1;
			var alignFirstNote;
			//
			// First Pass
			// 
			for(var t = 0; t < song.tracks.length ; t++, alignFirstNote = true ) {	
				if ( song.tracks[t].length > 0 ) {
					song.tracks[t][0].realTime  = song.tracks[t][0].deltaTime;	
					song.tracks[t][0].sortKey  = 0; 	
					if ( song.tracks[t][0].subtype == "trackName" && song.tracks[t][0].text == "Markers" ) { // TODO: This is Cubase Specific
						markerTrackNo = t;	
					}
					else if ( song.tracks[t][0].subtype == "trackName" && 
							song.tracks[t][0].text.toUpperCase().match(/^BASS.*/i)  && 
							( typeof opts.bassCh == 'undefined' || opts.bassCh == null ) ) { 
								var firstnoteOn = _.first(jp.query(song.tracks[t], "$..[?(@.subtype == 'noteOn')]") );
								opts.bassCh = firstnoteOn.channel;
					}
					for (var e = 1; e < song.tracks[t].length ; e++ ) {					
						song.tracks[t][e].realTime = song.tracks[t][e].deltaTime + song.tracks[t][e-1].realTime;
						song.tracks[t][e].sortKey  = e; 
					}
				}
			}		
			//
			// Second Pass - adjust the durations, but do it based on realtime for a more precise result
			// 
			for(var t = 0; t < song.tracks.length ; t++, alignFirstNote = true ) {	
				if ( song.tracks[t].length > 0 ) {
					var currRealTime = 0;
					var prevRealTime = 0;
					for (var e = 0; e < song.tracks[t].length ; e++ ) {	
						currRealTime = 0 ? 0 :  Math.round( song.tracks[t][e].realTime / normalize);
						song.tracks[t][e].realTime = currRealTime; 
						song.tracks[t][e].deltaTime = 	currRealTime - prevRealTime;
						prevRealTime = 	currRealTime;
					}
				}
			}
			//
			// Drum Track
			// 
			var drumsSearch = "$..[?(@.channel == " + opts.drumsCh  + ")]";
			this.progress("drumSearch:" + drumsSearch);
			var drumTrack = _.sortBy(jp.query(song, drumsSearch), function(obj) { return obj.sortKey; });
			//
			// Bass Track
			// 
			var bassSearch;
			var bassTrack;
			if ( typeof opts.bassCh !== 'undefined' && opts.bassCh !== null ) {
				bassSearch = "$..[?(@.channel == " +  opts.bassCh + ")]";
				this.progress("basSearch:" + bassSearch);
				bassTrack = _.sortBy(jp.query(song, bassSearch), function(obj) { return obj.sortKey; });
			}
			else {
				bassSearch = "$..[?(@.channel == " + bassTrackCh + ")]";
				bassTrack = _.sortBy(jp.query(song, bassSearch), function(obj) { return obj.sortKey; });
			}	
			//
			// Transform the bass track notes
			//
			var drumMap = _.isUndefined(opts.drumMap) ? cf.config.drumMap.rockDrumsWithBass :  cf.config.drumMap[opts.drumMap];
			this.progress("BASS Transpose:" + drumMap.bassTranspose);
			this.progress("bassTrack Length:" + bassTrack.length);
			var tCount = 0;
			for ( var b = 0 ; b < bassTrack.length; b++ ) {
				if ( _.has( bassTrack[b], "noteNumber" )) {
					bassTrack[b].noteNumber += drumMap.bassTranspose;
					tCount++;
				}
			}
			this.progress("bassTrack notes:" + tCount);
			
			//
			// Transform the drum track notes
			//
			for ( var d = 0 ; d < drumTrack.length; d++ ) {
				if ( _.has( drumTrack[d], "noteNumber" )) {
					var mappedNote = drumMap.drums[drumTrack[d].noteNumber.toString()]			
					if ( ! _.isUndefined(mappedNote) ) {
						// this.progress("Note:" + drumTrack[d].noteNumber + "=Mapped=>" + mappedNote);
						drumTrack[d].noteNumber = mappedNote;			
					}
				}
			}
			//
			// Read the Markers - TODO: having a marker track may be Cubase specific 
			//
			var markers = song.tracks[markerTrackNo];
			var lastMarker = markers.length -1 ; 
			for (var i = lastMarker; i >= 0 ; i-- ) {
				//
				// Extract the bass and drum event within the time range 
				// defined by deltaTime and deltaEndTime
				//
				if ( markers[i].subtype == "marker" && markers[i].text !== "" ) {	
					var midiStart = "$..[?(@.realTime >= " + markers[i].realTime + ")]";
					var midiEnd = "$..[?(@.realTime < " + markers[i+1].realTime + ")]";	
					var drumEvents = _.sortBy(jp.query( jp.query(drumTrack, midiStart ) , midiEnd ), function(obj) { return obj.sortKey; });
					var bassEvents = _.sortBy(jp.query( jp.query(bassTrack, midiStart ) , midiEnd ), function(obj) { return obj.sortKey; });
					//
					// Additional transpose for Bass notes
					//
					if ( ! _.isUndefined(opts.transpose) ) {
						for (var n = 0; n < bassEvents.length ; n++) {
							if ( bassEvents[n].subtype == "noteOn" ||  bassEvents[n].subtype == "noteOff" ) {
								bassEvents[n].noteNumber += opts.transpose;
							}
						}
					}
					//
					// First event deltaTime may overlap marker boundary
					// 
					var prevDrumEvent, drumOverLap, prevBassEvent, bassOverLap;
					var prevMidiEvent;
					if ( markers[i].realTime > 0 ) {
						if ( drumEvents.length > 0 ) {
							prevMidiEvent = "$..[?(@.sortKey == " + (drumEvents[0].sortKey - 1) + ")]";
							prevDrumEvent = jp.query(drumTrack, prevMidiEvent );
							if ( _.isUndefined( prevDrumEvent ) ) {
								drumEvents[0].deltaTime = 0;
							}
							else {
								drumOverLap   = markers[i].realTime - prevDrumEvent.realTime;
								drumEvents[0].deltaTime -= drumOverLap;
							}
						}
						if ( bassEvents.length > 0 ) {
							prevMidiEvent = "$..[?(@.sortKey == " + (bassEvents[0].sortKey - 1) + ")]";
							prevBassEvent = jp.query(bassTrack, prevMidiEvent );
							if ( _.isUndefined( prevBassEvent ) ) {
								bassEvents[0].deltaTime = 0;
							}
							else {
								bassOverLap   = markers[i].realTime - prevBassEvent.realTime;
								bassEvents[0].deltaTime -= bassOverLap;
							}
						}
					}
					//
					// Now write the song part
					//
					this.writeSongPart(markers[i], song, drumEvents, bassEvents, fileName, opts );
				}	 
			}	// end of read markers
		} // end of read midi files
	},
	//
	//
	createMidi : function ( fileNames, _opts ) {		
		var filePaths = [];
		var opts = {}
		if ( _.isString( fileNames) ) {	filePaths = fileNames.split(","); }
		else if ( _.isArray(fileNames) ) { filePaths = fileNames;}
		
		if 	( _.isObject(_opts) && ! _.isNull(_opts) ) { opts = _opts; }
		
		if 	( _.isUndefined(opts.bassCh) || _.isNull(opts.bassCh) ) { 	opts.bassCh = 1; }
		else if ( opts.bassCh > 1 ) { opts.bassCh -= 1; };
		
		if (  _.isUndefined(opts.bassTranspose) || _.isNull(opts.bassTranspose) ) { opts.bassTranspose = 0 }
		
		if (  _.isUndefined(opts.midiFormat) || _.isNull(opts.midiFormat) ) { opts.midiFormat = 1 }
		
		if 	( _.isUndefined(opts.drumsCh) || _.isNull(opts.drumsCh) ) { 	opts.drumsCh = 9; }
		else if ( opts.drumCh > 1 ) { opts.drumCh -= 1; };
		
		if 	( _.isUndefined(opts.verbose) || _.isNull(opts.verbose) ) { opts.verbose = true; }
		this.verbose = opts.verbose;

		opts.filePaths = filePaths;
		if ( opts.filePaths.length > 0 ) {
			this.progress("CONFIG:" + JSON.stringify(cf.config));
			this.readSongs( opts ); 
		}
		else {
			throw Error("No midi files supplied")
		}
	}
}
	
