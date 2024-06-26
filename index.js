require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ethers = require('ethers');
const { Subject, timer } = require('rxjs');
const { switchMap, tap, delay } = require('rxjs/operators');

const app = express();

app.use(cors());
app.use(express.json());

const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.providers.JsonRpcProvider('https://evm-devnet.nexis.network');

const addressesSubject = new Subject();
let addresses = [];

const signTransaction = async (address) => {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const tx = {
            to: address,
            value: ethers.utils.parseEther('0.2'),
            gasPrice: ethers.utils.parseUnits('1000', 'gwei'), 
            gasLimit: ethers.utils.hexlify(2100000),
        };
        console.log("Starting transaction", tx);
        const signedTx = await wallet.sendTransaction(tx);
        console.log('Signed Transaction:', signedTx);
    } catch (error) {
        console.error('Transaction failed', error);
    }
};

addressesSubject.pipe(
    switchMap(addresses => timer(10).pipe(
        tap(() => {
            if (addresses.length > 0) {
                const address = addresses.shift();
                signTransaction(address);
            }
        })
    ))
).subscribe({
    next: () => console.log('Processed an address'),
    error: (err) => console.error('Error:', err)
});

app.get('/', (req, res) => {
    res.send('Faucet v2 Running!');
});

app.post('/faucet', async (req, res) => {
    try {
        const { address } = req.body;
        addresses.push(address);
        addressesSubject.next(addresses);

        const positionInQueue = addresses.length;
        const estimatedTime = positionInQueue * 5; // 5 seconds per transaction

        res.status(200).send({ sent: true, positionInQueue, estimatedTime });
    } catch (error) {
        console.log(error);
        res.status(200).send({ sent: false, error: "Encountered an error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;