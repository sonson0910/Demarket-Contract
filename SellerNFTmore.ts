// import modules from libraries
import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    Wallet,
} from "https://deno.land/x/lucid@0.8.4/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

// Create the lucid api
const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// Select wallet
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./owner.seed"));

// Function to read validator from plutus.json file
async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// Read the validator and assign it to a variable
const validator = await readValidator();

// Public key of the seller
const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

// Public key of the NFT creator
const authorPublicKeyHash =
    lucid.utils.getAddressDetails("addr_test1qpkxr3kpzex93m646qr7w82d56md2kchtsv9jy39dykn4cmcxuuneyeqhdc4wy7de9mk54fndmckahxwqtwy3qg8pums5vlxhz")
        .paymentCredential.hash;


// --------------------------------------------------------------------------

// initialize the Datum object
const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String,
    author: Data.String,
    price: Data.BigInt,
    royalties: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

// The data needed for the datum field (Public key of the seller and author above)
const Price = 100000000n;
const royalties = BigInt(parseInt(Price) * 1 / 100);
const policyId1 = "c5dfd5c92cf454d9d1ee40d9ab3e9208dc21197d88ce51fe3160e01f";
const assetName1 = "4d794d696e746564546f6b656e";
const policyId2 = "d8db13a077b4fd63b5560e9cea7e39f0b11a67eeb89f5e3df9a45d0a";
const assetName2 = "4e46542044454d4f";
const policyId = [policyId1, policyId2];
const assetName = [assetName1, assetName2];
const NFT = [policyId1 + assetName1, policyId2 + assetName2];
const fee = royalties + BigInt(parseInt(Price) * 1 / 100);

let datum = []


for (let i = 0; i < NFT.length; i++) {
    // Pass data into datum
    let tmp = Data.to<Datum>(
        {
            policyId: policyId[i],
            assetName: assetName[i],
            seller: ownerPublicKeyHash,
            author: authorPublicKeyHash,
            price: Price,
            royalties: royalties,
        },
        Datum
    );
    datum.push(tmp);
}



// Asset locking function
async function lock(NFT, fee, { into, datum }): Promise<TxHash> {
    // Read the contract address from the validator variable
    const contractAddress = lucid.utils.validatorToAddress(into);
    console.log(contractAddress);

    // Create transaction
    let tx = await lucid
        .newTx();

    for (let i = 0; i < datum.length; i++) {
        tx = await tx.payToContract(contractAddress, { inline: datum[i] }, { [NFT[i]]: 1n, lovelace: fee });
    }

    tx = await tx
        .complete();

    // Sign transaction
    const signedTx = await tx.sign().complete();

    // Send transactions to onchain
    return signedTx.submit();
}

// Lock assets into contracts
const txLock = await lock(NFT, fee, { into: validator, datum: datum });

// Time until the transaction is confirmed on the Blockchain
await lucid.awaitTx(txLock);

console.log(`NFT locked into the contract
    Tx ID: ${txLock}
    Datum: ${datum}
`);
