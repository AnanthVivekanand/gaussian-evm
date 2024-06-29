pragma solidity ^0.8.0;

import "./GaussianCDF.sol";

contract GaussianCDFWrapper {
    // using GaussianCDF for int256;

    function cdf(int256 x, int256 mean, int256 stdDev) public pure returns (int256) {
        return GaussianCDF.cdf(x, mean, stdDev);
    }
}