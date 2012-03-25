var char = {
    check: '\u2713',
    error: '\u2717'
};


var color = {
    _red: '\033[31m',
    _green: '\033[32m',
    _greenBold: '\033[32;1m',
    _reset: '\033[0m',

    clear: function () {
        this._red = '';
        this._green = '';
        this._greenBold = '';
    },

    greenBold: function ( str ) {
        return (this._greenBold)+str+(this._reset);
    },

    green: function ( str ) {
        return (this._green)+str+(this._reset);
    },

    red: function ( str ) {
        return (this._red)+str+(this._reset);
    }
};


var reporter = {
    errors: false,

    // Strangelly enough, the scope of this function will be sandboxed by page.evaluate(). Take care!
    check: function () {
        var failures, body = document.body;

        if ( body.querySelector( '.finished-at' ) && body.querySelector( 'div.runner a.description' ) ) {
            failures = body.querySelectorAll( 'div.jasmine_reporterer > div.suite.failed' );

            return {
                title: document.title,
                description: body.querySelector( 'div.runner a.description' ).innerText,
                failures: failures.length
            };
        }
    },

    exit: function () {
        console.log( '\nDone in '+color.greenBold( this.getDuration() )+' milisecs.' );
        phantom.exit( this.errors? 1: 0 );
    },

    fail: function ( url, message ) {
        this.errors = true;

        console.log( '\n'+url );
        console.log( '\t'+color.red( message ) );

        this.update();
    },

    getDuration: function () {
        var endTime = new Date();
        return endTime - this.startTime;
    },

    isAllTested: function () {
        return this.resultsRemaining === 0;
    },

    startCount: function ( total ) {
        this.resultsRemaining = total;
    },

    startTimer: function () {
        this.startTime = new Date();
    },

    update: function () {
        this.updateCount();

        if ( this.isAllTested() ) {
            this.exit();
        }
    },

    updateCount: function () {
        this.resultsRemaining--;
    }
};

// phantom.args.splice() method doesn't work, need to create
// another array.
args = Array.prototype.slice.call( phantom.args );


if ( phantom.version.major == 1 && phantom.version.minor < 4 ) {
    console.log( 'Your Phantom version is outdated. Please get a version >= 1.4.0.' );
    phantom.exit( 1 );
}


if ( args.length === 0 ) {
    console.log( 'Error: No url given.' );
    phantom.exit( 1 );
}


i = args.indexOf( '--no-color' );


if ( i >=0 ) {
    color.clear();
    args.splice( 0, 1 );
}


urls = args;


console.log( color.greenBold( 'Running Jasmine tests...' ) );


reporter.startCount( args.length );
reporter.startTimer();


urls.forEach( function ( url ) {

    var page = new WebPage();

    page.open( url, function ( status ) {
        var timerId;

        if ( status === 'fail' ) {
            reporter.fail( url, 'Error: Runner not found... Please check the url.' );
        } else {
            timerId = setInterval( function () {
                var result = page.evaluate( reporter.check );

                if ( result ) {
                    console.log( '\n'+color.greenBold( result.title )+' ('+url+')' );

                    if ( result.failures ) {
                        reporter.errors = true;
                        console.log( color.red( '\t'+char.error+' '+result.description ) );
                    } else {
                        console.log( color.green( '\t'+char.check+' '+result.description ) );
                    }

                    reporter.update();

                    clearInterval( timerId );
                }

                if ( reporter.getDuration() > 10000 ) {
                    reporter.fail( url, 'Error: Timed out... Please check the url.' );

                    clearInterval( timerId );
                }

           }, 100 ); // setInterval()
       }
    }); // page.open()

});
