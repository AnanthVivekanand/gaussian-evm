pragma solidity ^0.8.0;

library GaussianCDF {
    int256 private constant FIXED_1 = 1e18; 
    int256 private constant SQRT_2 = 1414213562373095048; // sqrt(2)
    int256 private constant SQRT_2PI = 2506628274631000502; // sqrt(2pi)

    function cdf(int256 x, int256 mean, int256 stdDev) public pure returns (int256) {
        require(stdDev > 0 && stdDev <= 1e19, "Invalid standard deviation");
        require(mean >= -1e20 && mean <= 1e20, "Invalid mean");
        require(x >= -1e23 && x <= 1e23, "x out of range");

        int256 z = ((x - mean) * FIXED_1) / stdDev;
        
        if (z < -40 * FIXED_1) return 0;
        if (z > 40 * FIXED_1) return FIXED_1;

        return FIXED_1 / 2 + (erf(z / SQRT_2) * FIXED_1) / 2;
    }

    // Error function (erf)
    function erf(int256 x) private pure returns (int256) {
        int256 z = abs(x);
        int256 t = FIXED_1 / (FIXED_1 + (z * 31830988618379067) / (100000000000000000));

        int256 result = FIXED_1 - t * exp(-z * z / FIXED_1 +
            (-352513787021902989 +
            t * (302985994769246233 +
            t * (-127986537271042856 +
            t * (14997160103219171 +
            t * (-780461776943986 +
            t * (14819511112937)))))
            ) / FIXED_1);

        return x >= 0 ? result : -result;
    }

    // Helper functions
    function abs(int256 x) private pure returns (int256) {
        return x >= 0 ? x : -x;
    }

    function exp(int256 x) private pure returns (int256) {
        if (x > 133e16) return type(int256).max; // Prevent overflow
        if (x < -41e18) return 0; // exp(-41) is very close to zero

        int256 result = FIXED_1;
        int256 xi = x;
        int256 term = FIXED_1;

        for (int256 i = 1; i <= 32; i++) {
            term = (term * xi) / (i * FIXED_1);
            result += term;
            if (term < 1e7) break; // Stop when the term becomes negligible
        }

        return result;
    }
}