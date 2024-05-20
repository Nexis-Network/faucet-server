require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ethers = require('ethers')

const app = express();

app.use(cors());
app.use(express.json()); 

const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.providers.JsonRpcProvider('https://evm-testnet.nexis.network');

const requestHistory = {};

let gasprice= 5;

async function signTransaction(address) {
  const wallet = new ethers.Wallet(privateKey, provider);

  gasprice++;
  const tx = {
    to: address,
    value: ethers.utils.parseEther('200'),
    gasPrice: ethers.utils.parseUnits(gasprice.toString(), 'gwei')
  };

  const signedTx = await wallet.sendTransaction(tx);
  console.log('Signed Transaction:', signedTx);
}

app.get('/', (req, res) => {
    res.send('Faucet v1 Running!');
});

app.post('/faucet', async(req, res) => {
    try {
        const {address} = req.body;
        const lastRequestTime = requestHistory[address];
        if (lastRequestTime && (Date.now() - lastRequestTime < 24 * 60 * 60 * 1000)) {
            res.status(200).send({sent: false, error: "Address already requested tokens in the last 24 hours."});
            return;
        }

        await signTransaction(address);
        requestHistory[address] = Date.now();
        res.status(200).send({sent: true});
    } catch (error) {
        console.log(error)
        res.status(200).send({sent: false, error:"transaction queued, wait few minutes, balances will reload"});
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
