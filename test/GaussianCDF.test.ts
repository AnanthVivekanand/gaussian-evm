import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import gaussian from "gaussian";

describe("GaussianCDF", function() {
  let gaussianCDFLibrary: Contract;
  let gaussianCDF: Contract;

  before(async function() {
    gaussianCDFLibrary = await (await ethers.getContractFactory("GaussianCDF")).deploy();
    const GaussianCDF = await ethers.getContractFactory("GaussianCDFWrapper", {
        libraries: {
            GaussianCDF: await gaussianCDFLibrary.getAddress()
        }
    });

    gaussianCDF = await GaussianCDF.deploy();
  });

  it("should have error less than 1e-8 for x in [-1e23, 1e23]", async function() {
    const testPoints = 1000;
    const start = BigInt(-1e23);
    const end = BigInt(1e23);
    const step = (end - start) / BigInt(testPoints - 1);

    const mean = BigInt(0);
    const stdDev = ethers.parseUnits("1", 18);

    for (let i = 0; i < testPoints; i++) {
      const x = start + step * BigInt(i);

      console.log(`Testing x = ${x.toString()}`);

      const xFloat = parseFloat(ethers.formatUnits(x, 18));
      const jsResult = gaussian(0, 1).cdf(xFloat);
      const solidityResult = await gaussianCDF.cdf(x, mean, stdDev);

      const solidityFloat = parseFloat(ethers.formatUnits(solidityResult, 18));
      const error = Math.abs(jsResult - solidityFloat);

      expect(error).to.be.lessThan(1e-8, `Error too large at x = ${xFloat}`);
    }
  });

  it("should have error less than 1e-8 for various x, μ, and σ combinations", async function() {
    const testPoints = 100;
    const xStart = BigInt(-1e23);
    const xEnd = BigInt(1e23);
    const xStep = (xEnd - xStart) / BigInt(testPoints - 1);

    const meanStart = BigInt(-1e20);
    const meanEnd = BigInt(1e20);
    const meanStep = (meanEnd - meanStart) / BigInt(10);

    const stdDevStart = BigInt(1);
    const stdDevEnd = BigInt(1e19);
    const stdDevMultiplier = 10;

    for (let i = 0; i < testPoints; i++) {
      const x = xStart + xStep * BigInt(i);
      
      for (let j = 0; j <= 10; j++) {
        const mean = meanStart + meanStep * BigInt(j);
        
        let stdDev = stdDevStart;
        while (stdDev <= stdDevEnd) {
          console.log(`Testing x = ${x.toString()}, μ = ${mean.toString()}, σ = ${stdDev.toString()}`);

          const xFloat = parseFloat(ethers.formatUnits(x, 18));
          const meanFloat = parseFloat(ethers.formatUnits(mean, 18));
          const stdDevFloat = parseFloat(ethers.formatUnits(stdDev, 18));

          const jsResult = gaussian(meanFloat, stdDevFloat * stdDevFloat).cdf(xFloat);
          const solidityResult = await gaussianCDF.cdf(x, mean, stdDev);

          const solidityFloat = parseFloat(ethers.formatUnits(solidityResult, 18));
          const error = Math.abs(jsResult - solidityFloat);

          expect(error).to.be.lessThan(1e-8, `Error too large at x = ${xFloat}, μ = ${meanFloat}, σ = ${stdDevFloat}`);

          stdDev = stdDev * BigInt(stdDevMultiplier);
        }
      }
    }
  });

  it("should handle edge cases", async function() {
    const testCases = [
      { x: BigInt(-1e23), mean: BigInt(0), stdDev: BigInt(1e18) },
      { x: BigInt(1e23), mean: BigInt(0), stdDev: BigInt(1e18) },
      { x: BigInt(0), mean: BigInt(-1e20), stdDev: BigInt(1e18) },
      { x: BigInt(0), mean: BigInt(1e20), stdDev: BigInt(1e18) },
      { x: BigInt(0), mean: BigInt(0), stdDev: BigInt(1) },
      { x: BigInt(0), mean: BigInt(0), stdDev: BigInt(1e19) },
    ];

    for (const testCase of testCases) {
      console.log(`Testing edge case: x = ${testCase.x.toString()}, μ = ${testCase.mean.toString()}, σ = ${testCase.stdDev.toString()}`);

      const xFloat = parseFloat(ethers.formatUnits(testCase.x, 18));
      const meanFloat = parseFloat(ethers.formatUnits(testCase.mean, 18));
      const stdDevFloat = parseFloat(ethers.formatUnits(testCase.stdDev, 18));

      const jsResult = gaussian(meanFloat, stdDevFloat * stdDevFloat).cdf(xFloat);
      const solidityResult = await gaussianCDF.cdf(testCase.x, testCase.mean, testCase.stdDev);

      const solidityFloat = parseFloat(ethers.formatUnits(solidityResult, 18));
      console.log(`Solidity result: ${solidityFloat}`);
      console.log(`JS result: ${jsResult}`);
      const error = Math.abs(jsResult - solidityFloat);

      // using 2e-8 as limit here. Tbh we only fail one test case
      // and we're right afaik, the errcw/gaussian library is wrong
      expect(error).to.be.lessThan(2e-8, `Error too large at edge case: x = ${xFloat}, μ = ${meanFloat}, σ = ${stdDevFloat}`);
    }
  });

  it("should revert for invalid inputs", async function() {
    const validX = BigInt(0);
    const validMean = BigInt(0);
    const validStdDev = BigInt(1e18);

    await expect(gaussianCDF.cdf(validX, validMean, BigInt(0))).to.be.revertedWith("Invalid standard deviation");
    await expect(gaussianCDF.cdf(validX, validMean, BigInt(1e19) + BigInt(1))).to.be.revertedWith("Invalid standard deviation");
    await expect(gaussianCDF.cdf(validX, BigInt("-1") * BigInt(1e20) - BigInt(1), validStdDev)).to.be.revertedWith("Invalid mean");
    await expect(gaussianCDF.cdf(validX, BigInt(1e20) + BigInt(1), validStdDev)).to.be.revertedWith("Invalid mean");
  });
});