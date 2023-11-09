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
} from "https://deno.land/x/lucid@0.8.3/mod.ts";
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
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./beneficiary.seed"));

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

// ---------------------------------------------------
// Doc dia chi hop dong tu bien validator
const scriptAddress = lucid.utils.validatorToAddress(validator);

// Khoi tao doi tuong cua Datum
const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String,
    // buyer: Data.String,
    author: Data.String,
    price: Data.BigInt,
    royalties: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

// Lay ra toan bo UTxO co tren dia chi hop dong
const scriptUtxos = await lucid.utxosAt(scriptAddress);

// List ra tat ca cac UTxO co tren dia chi hop dong
const utxos = scriptUtxos.filter((utxo) => {
    console.log(utxo);
    const datum = Data.from<Datum>(utxo.datum, Datum);
    console.log(datum)
    console.log("-----------------------------------------------------------")
});

const redeemer = Data.empty();
console.log(redeemer)