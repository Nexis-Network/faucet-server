require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ethers = require('ethers');

const app = express();

app.use(cors());
app.use(express.json());

const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.providers.JsonRpcProvider('https://evm-testnet.nexis.network');

const requestHistory = {};

let gasPrice = ethers.utils.parseUnits('5', 'gwei'); // Starting gas price

async function signTransaction(address) {
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Increment the gas price for each transaction
    gasPrice = gasPrice.add(ethers.utils.parseUnits('1', 'gwei'));
    
    const tx = {
        to: address,
        value: ethers.utils.parseEther('1'),
        gasPrice: gasPrice,
        gasLimit: ethers.utils.hexlify(21000),
    };

    const signedTx = await wallet.sendTransaction(tx);
    console.log('Signed Transaction:', signedTx);
}

app.get('/', (req, res) => {
    res.send('Faucet v1 Running!');
});

app.post('/faucet', async(req, res) => {
    try {
        const { address } = req.body;
        const lastRequestTime = requestHistory[address];
        if (lastRequestTime && (Date.now() - lastRequestTime < 24 * 60 * 60 * 1000)) {
            res.status(200).send({ sent: false, error: "Address already requested tokens in the last 24 hours." });
            return;
        }

        await signTransaction(address);
        requestHistory[address] = Date.now();
        res.status(200).send({ sent: true });
    } catch (error) {
        console.log(error);
        res.status(200).send({ sent: false, error: "Transaction failed, please contact us" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
