/**
 * 29 verified printed expansion codes for physical English/international sets from Scarlet & Violet onward.
 * TCGdex `abbreviation.official` is the starting source: https://api.tcgdex.net/v2/en/sets/{id}, read 2026-11-06.
 * Physical card marks override the catalog abbreviation for 2023sv (M23) and 2024sv (M24).
 * Earlier sets used printed expansion symbols, so their TCGdex catalog abbreviations are omitted.
 * Digital-only TCG Pocket sets are also omitted because they have no physical printed card code.
 * 30th Classic Collection reprints retain their original card marks; MFB has no confirmed printed code.
 * Japanese/Korean responses expose no separate `abbreviation.official`; their set ID is still shown as the extension ID.
 * IDs without a verified printed code are intentionally absent.
 */
export const TCG_SET_PRINTED_CODES: Readonly<Record<string, string>> = {
  "sv01": "SVI",
  "sve": "SVE",
  "svp": "SVP",
  "sv02": "PAL",
  "2023sv": "M23",
  "sv03": "OBF",
  "sv03.5": "MEW",
  "sv04": "PAR",
  "sv04.5": "PAF",
  "sv05": "TEF",
  "sv06": "TWM",
  "sv06.5": "SFA",
  "sv07": "SCR",
  "sv08": "SSP",
  "2024sv": "M24",
  "sv08.5": "PRE",
  "sv09": "JTG",
  "sv10": "DRI",
  "sv10.5w": "WHT",
  "sv10.5b": "BLK",
  "mee": "MEE",
  "mep": "MEP",
  "me01": "MEG",
  "me02": "PFL",
  "me02.5": "ASC",
  "me03": "POR",
  "me04": "CRI",
  "me05": "PBL",
  "30th": "30C",
};
