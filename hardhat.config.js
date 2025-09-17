require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    seimainnet: {
      url: "https://evm-rpc.sei-apis.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    local: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "0x7c852118e8d2787a3056f6f15c7f6a8d7167e2c281671bf12f2a382eb1d9e412",
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
        "0x8b3a9cf6ddbc4cb8038d219d4fd4455c9d58c1b62d45ce9e8434bedc3a6f163a",
        "0x92db14e403b83dfe3df233f83dfa3a8d402fafcec558aa6d5bfea1ee5c00a7a2",
        "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f3f8a6c912e1b0a",
        "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
        "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6f409c6",
      ],
    },
  },
};
