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

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preprod.blockfrost.io/api/v0",
        "preprodYd2VNkm9WsOYSvaWiuWeCFWwUktkaNAE",
    ),
    "Preprod",
);

const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./owner.seed"));

async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

const validator = await readValidator();

const contractAddress = lucid.utils.validatorToAddress(validator);
console.log(contractAddress);