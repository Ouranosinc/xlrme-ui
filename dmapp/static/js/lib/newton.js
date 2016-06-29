/*
 * Newton's method for finding roots
 *
 * code adapted from D.V. Fedorov,
 * “Introduction to Numerical Methods with examples in Javascript”
 * http://owww.phys.au.dk/~fedorov/nucltheo/Numeric/11/book.pdf
 * (licensed under the GPL)
 * by Philippe Riviere <philippe.riviere@illisible.net> March 2014
 * modified for compatibility with Chrome/Safari
 * added a max iterations parameter
 *
 * Usage: Newton.Solve(Math.exp, 2)); => ~ log(2)
 *        Newton.Solve(d3.geo.chamberlin(), [200,240])
 */
(function() { Newton = {version: "1.0.0"}; // semver

  Newton.Norm = function (v) {
      return Math.sqrt(v.reduce(function (s, e) {
          return s + e * e
      }, 0));
  }

  Newton.Dot = function (a, b) {
      var s = 0;
      for (var i in a) s += a[i] * b[i];
      return s;
  }

  // QR - decomposition A=QR of matrix A
  Newton.QRDec = function(A){
    var m = A.length, R = [];
    for (var j in A) {
        R[j] = [];
        for (var i in A) R[j][i] = 0;
    }

    var Q = [];
    for (var i in A) {
        Q[i] = [];
        for (var j in A[0]) Q[i][j] = A[i][j];
    }

    // Q is a copy of A
    for (var i = 0; i < m; i++) {
        var e = Q[i],
            r = Math.sqrt(Newton.Dot(e, e));
        if (r == 0) throw "Newton.QRDec: singular matrix"
        R[i][i] = r;
        for (var k in e) e[k] /= r;
        // normalization
        for (var j = i + 1; j < m; j++) {
            var q = Q[j],
                s = Newton.Dot(e, q);
            for (var k in q) q[k] -= s * e[k];
            // orthogonalization
            R[j][i] = s;
        }
    }
    return [Q, R];
  };

  // QR - backsubstitution
  // input: matrices Q,R, array b; output: array x such that QRx=b
  Newton.QRBack = function(Q, R, b) {
    var m = Q.length,
        c = new Array(m),
        x = new Array(m);
    for (var i in Q) {
        // c = QˆT b
        c[i] = 0;
        for (var k in b) c[i] += Q[i][k] * b[k];
    }
    for (var i = m - 1; i >= 0; i--) {
        // back substitution
        for (var s = 0, k = i + 1; k < m; k++) s += R[k][i] * x[k];
        x[i] = (c[i] - s) / R[i][i];
    }
    return x;
  }

  // calculates inverse of matrix A
  Newton.Inverse = function(A){
    var t = Newton.QRDec(A),
        Q = t[0],
        R = t[1];
    var m = [];
    for (i in A) {
        n = [];
        for (k in A) {
            n[k] = (k == i ? 1 : 0)
        }
        m[i] = Newton.QRBack(Q, R, n);
    }
    return m;
  };

  Newton.Zero = function (fs, x, opts={} /* acc, dx, max */) {
    // Newton's root-finding method

    if (opts.acc == undefined) opts.acc = 1e-6
    if (opts.dx == undefined) opts.dx = 1e-3
    if (opts.max == undefined) opts.max = 40 // max iterations
    var J = [];
    for (i in x) {
        J[i] = [];
        for (j in x) J[i][j] = 0;
    }

    var minusfx = [];
    var v = fs(x);
    if (v == null) throw "unable to compute fs at "+JSON.stringify(x)
    for (i in x) minusfx[i] = -v[i];
    do {
        if (opts.max-- < 0) return null;
        for (i in x)
            for (k in x) {
                // calculate Jacobian
                x[k] += opts.dx
                v = fs(x);
                if (v == null) throw "unable to compute fs at "+JSON.stringify(x)
                J[k][i] = (v[i] + minusfx[i]) / opts.dx
                x[k] -= opts.dx
            }
        var t = Newton.QRDec(J),
            Q = t[0],
            R = t[1],
            Dx = Newton.QRBack(Q, R, minusfx)
            // Newton's step
            var s = 2
        do {
            // simple backtracking line search
            s = s / 2;
            var z = [];
            for (i in x) {
                z[i] = x[i] + s * Dx[i];
            }

            var minusfz = [];
            v = fs(z);
            if (v == null) throw "unable to compute fs at "+JSON.stringify(z)
            for (i in x) {
                minusfz[i] = -v[i];
            }
        }
        while (Newton.Norm(minusfz) > (1 - s / 2) * Newton.Norm(minusfx) && s > 1. / 128)
        minusfx = minusfz;
        x = z;
        // step done
    }
    while (Newton.Norm(minusfx) > opts.acc)

    return x;
  }

  Newton.Solve = function(fs, res, opts={}){
    if (typeof res != 'object') res = [ typeof res == 'number'
        ? + res
        : 0
    ];
    var _fs = fs, fs = function(x) {
        var r = _fs(x);
        if (typeof r == 'number') r = [ r ];
        for (var i in r) r[i] -= res[i];
        return r;
    }
    
    var start = [];
    if (opts.start) {
        start = opts.start;
    } else {
        for (var i in res) start[i]=0;
    }

    var n = Newton.Zero(fs, start, opts);
    if (n && n.length == 1) n = n[0];
    return n;
  };
})();
