// import module tu cac thu vien
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

// Khoi tao api lucid
const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// Select vi
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./owner.seed"));

// Ham doc validator tu file plutus.json
async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// Doc validator va gan vao mot bien
const validator = await readValidator();

// Public key nguoi ban
const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

// Public key nguoi tao ra NFT
const authorPublicKeyHash =
    lucid.utils.getAddressDetails("addr_test1vqhs6zag6mfkr8qj8l59sh5mfx7g0ay6hc8qfza6y8mzp9c3henpx")
        .paymentCredential.hash;


// --------------------------------------------------------------------------

// Khoi tao doi tuong cua Datum
const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String, 
    author: Data.String,
    price: Data.BigInt,
    royalties: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

// Cac du lieu can cho truong datum (public key cua nguoi ban va tac gia o tren)
const Price = 100000000n;
const royalties = BigInt(parseInt(Price) * 1 / 100);
const policyId = "1d33beb371d0c7e81450251da24703aecb09f1dbe2b3389895896a55";
const assetName = "4e46542044454d4f";

// Truyen du lieu vao datum
const datum = Data.to<Datum>(
    {
        policyId: policyId,
        assetName: assetName,
        seller: ownerPublicKeyHash, 
        author: authorPublicKeyHash,
        price: Price,
        royalties: royalties,
    },
    Datum
);

// NFT dung de ban
const NFT = policyId + assetName;
console.log(NFT)

// Ham khoa tai san
async function lock(NFT, { into, datum }): Promise<TxHash> {
    // Doc dia chi hop dong tu bien validator
    const contractAddress = lucid.utils.validatorToAddress(into);
    console.log(contractAddress);
    
    // Tao giao dich
    const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { [NFT]: 1n }) // Gui NFT, datum len hop dong co dia chi da doc o tren
        .complete();

    // Ki giao dich
    const signedTx = await tx.sign().complete(); 

    // Gui giao dich len onchain
    return signedTx.submit(); 
}

// Khoa tai san len hop dong
const txLock = await lock(NFT, { into: validator, datum: datum });

// Thoi gian cho den khi giao dich duoc xac nhan tren Blockchain
await lucid.awaitTx(txLock);

console.log(`NFT locked into the contract
    Tx ID: ${txLock}
    Datum: ${datum}
`);