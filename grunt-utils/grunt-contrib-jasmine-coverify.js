/*jshint node:true*/
var parse = require('coverify/parse');
var fs = require('fs');
var template = __dirname + '/DefaultRunner.tmpl';
var reporter = __dirname + '/reporter.js';
var logOverride = __dirname + '/logOverride.js';



function percent (x, total) {
    if (total === 0) return '0.00';
    var s = String(Math.floor(x / total * 100 * 100) / 100);
    if (!/\./.test(s)) s += '.';
    return s + Array(2 - s.split('.')[1].length + 1).join('0');
}


exports.process = function (grunt, task, context) {
    task.copyTempFile(logOverride, 'logOverride.js');
    context.scripts.polyfills.push(context.temp + '/logOverride.js');
    task.copyTempFile(reporter, 'reporter.js');
    context.scripts.reporters = [context.temp + '/reporter.js'];
    
    var output = fs.createWriteStream(__dirname  + '/../coverage.json');
    var parser = parse(function (err, sources, counts) {
        if (err) {
            grunt.log.error(err);
        } else {
            var total = { expr: 0, total: 0 };
            Object.keys(counts).forEach(function (file) {
                total.expr += counts[file].expr;
                total.total += counts[file].total;
            });
            
            Object.keys(sources).forEach(function (file) {
                if (sources[file].length === 0) return;
                
                var lines = {};
                sources[file].forEach(function (m) {
                    if (!lines[m.line]) lines[m.line] = [];
                    lines[m.line].push(m);
                });
                
                Object.keys(lines).forEach(function (ix) {
                    var line = lines[ix];
                    var parts = [];
                    var column = 0;
                    var str;
                    
                    var xxx = '';
                    
                    line.forEach(function (m) {
                        m.lines.forEach(function (row, ix) {
                            str = row.line;
                            var r = row.range;
                            
                            if (ix > 0) parts.push('\n  ');
                            
                            parts.push(str.slice(column, r[0]));
                            parts.push(str.slice(r[0], r[1] + 1));
                            
                            column = r[1] + 1;
                            
                            if (str.length > xxx.length) {
                                xxx += Array(str.length - xxx.length + 1).join('x');
                            }
                            
                            var a = r[0], b = r[1];
                            if (ix > 0) {
                                var ma = /\S/.exec(str);
                                a = ma ? ma.index - 1 : 0;
                            }
                            
                            var rep = Array(b - a + 1).join('^');
                            
                            var xparts = xxx.split('');
                            xparts.splice(a + 1, b - a, rep);
                            xxx = xparts.join('');
                        });
                    });
                    parts.push(str.slice(column));
                    
                    var s = parts.join('');
                    output.write(
                        '# ' + file + 
                        ': line ' + (line[0].lineNum + 1) + 
                        ', column ' + line.map(function (m) {
                            return (line[0].column[0] + 2) + '-' + line[0].column[1];
                        }).join(', ') + 
                        '\n\n'
                    );
                    output.write('  ' + s + '\n');
                    output.write('  ' + xxx.replace(/x/g, ' ') + '\n\n');
                });
            });
            var p = percent(total.expr, total.total);
            var percentLog = '# coverage: ' + 
                total.expr + '/' + total.total + 
                ' (' + p + ' %)\n\n';
            
            output.write(  percentLog );
            grunt.log.write('\n' + percentLog );
        }
    });
     
    task.phantomjs.on('jasmine.coverify', function (log) {
        parser.end(log);
    });
    
    var source = grunt.file.read(template);
    return grunt.util._.template(source, context);
};