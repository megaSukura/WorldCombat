/**
 * 自然之恩 / naturalgift —— 参数、伤害段与树果读取。
 *
 * 核心念头：咬碎自己带着的那颗树果，让它的元素从体内涌上来，踏前一步把这一口自然之力砸在对手身上；
 * 树果当场被吃掉，招式的属性与威力就是那颗树果的属性与威力。
 *
 * 数值来源（原生）：Normal／物理／命中 100／PP 15；威力与属性取自携带树果的 naturalGift 表
 * （Showdown items.js：basePower 80–100、属性随果），命中后消耗树果。原生固定值只作公式起点：
 * 威力由树果基础值加物攻成长，咀嚼时间、突进距离与速度、判定、顶开分别读不同精灵数据。
 *
 * 事实接入：树果的威力是一个自定义纯事实 `gift.power`（`defineFacts`），供威力公式与悬浮说明共用；
 * 属性由同一个读取器在伤害 `resolve` 里给出，预览与命中读同一份，因此 Tree 果属性也参与本系加成与相性。
 */
namespace PokemonSkills {
    export interface NaturalgiftGift { power: number; type: string; colour: number; }
    /** Cobblemon 物品路径 -> [原威力, 招式属性]；来自 Showdown naturalGift 表，键去命名空间。 */
    const naturalgiftGifts: { [item: string]: [number, string] } = {
        "aguav_berry": [80, "dragon"], "apicot_berry": [100, "ground"], "aspear_berry": [80, "ice"],
        "babiri_berry": [80, "steel"], "belue_berry": [100, "electric"], "bluk_berry": [90, "fire"],
        "charti_berry": [80, "rock"], "cheri_berry": [80, "fire"], "chesto_berry": [80, "water"],
        "chilan_berry": [80, "normal"], "chople_berry": [80, "fighting"], "coba_berry": [80, "flying"],
        "colbur_berry": [80, "dark"], "cornn_berry": [90, "bug"], "custap_berry": [100, "ghost"],
        "durin_berry": [100, "water"], "enigma_berry": [100, "bug"], "figy_berry": [80, "bug"],
        "ganlon_berry": [100, "ice"], "grepa_berry": [90, "flying"], "haban_berry": [80, "dragon"],
        "hondew_berry": [90, "ground"], "iapapa_berry": [80, "dark"], "jaboca_berry": [100, "dragon"],
        "kasib_berry": [80, "ghost"], "kebia_berry": [80, "poison"], "kee_berry": [100, "fairy"],
        "kelpsy_berry": [90, "fighting"], "lansat_berry": [100, "flying"], "leppa_berry": [80, "fighting"],
        "liechi_berry": [100, "grass"], "lum_berry": [80, "flying"], "mago_berry": [80, "ghost"],
        "magost_berry": [90, "rock"], "maranga_berry": [100, "dark"], "micle_berry": [100, "rock"],
        "nanab_berry": [90, "water"], "nomel_berry": [90, "dragon"], "occa_berry": [80, "fire"],
        "oran_berry": [80, "poison"], "pamtre_berry": [90, "steel"], "passho_berry": [80, "water"],
        "payapa_berry": [80, "psychic"], "pecha_berry": [80, "electric"], "persim_berry": [80, "ground"],
        "petaya_berry": [100, "poison"], "pinap_berry": [90, "grass"], "pomeg_berry": [90, "ice"],
        "qualot_berry": [90, "poison"], "rabuta_berry": [90, "ghost"], "rawst_berry": [80, "grass"],
        "razz_berry": [80, "steel"], "rindo_berry": [80, "grass"], "roseli_berry": [80, "fairy"],
        "rowap_berry": [100, "dark"], "salac_berry": [100, "fighting"], "shuca_berry": [80, "ground"],
        "sitrus_berry": [80, "psychic"], "spelon_berry": [90, "dark"], "starf_berry": [100, "psychic"],
        "tamato_berry": [90, "psychic"], "tanga_berry": [80, "bug"], "wacan_berry": [80, "electric"],
        "watmel_berry": [100, "fire"], "wepear_berry": [90, "electric"], "wiki_berry": [80, "rock"],
        "yache_berry": [80, "ice"]
    };
    const naturalgiftColours: { [type: string]: number } = {
        normal: 0xA8A878, fire: 0xF08030, water: 0x6890F0, electric: 0xF8D030, grass: 0x78C850, ice: 0x98D8D8,
        fighting: 0xC03028, poison: 0xA040A0, ground: 0xE0C068, flying: 0xA890F0, psychic: 0xF85888,
        bug: 0xA8B820, rock: 0xB8A038, ghost: 0x705898, dragon: 0x7038F8, dark: 0x705848, steel: 0xB8B8D0, fairy: 0xEE99AC
    };
    /** 去掉命名空间后的物品路径，`cobblemon:cheri_berry` -> `cheri_berry`。 */
    function naturalgiftKey(id: string): string {
        var value = String(id || "").toLowerCase(), split = value.indexOf(":");
        return split < 0 ? value : value.slice(split + 1);
    }
    /** 由物品 id 读出的恩赐；空手、未命名或不在表里的物品返回 null（这招就没有力量可用）。 */
    export function naturalgiftGiftByItem(id: string): NaturalgiftGift | null {
        if (!id) return null;
        var entry = naturalgiftGifts[naturalgiftKey(id)];
        if (!entry) return null;
        return { power: entry[0], type: entry[1], colour: naturalgiftColours[entry[1]] || 0x9ED47A };
    }
    /** 携带树果的恩赐；给定个体读取（供现场与 AI 使用）。 */
    export function naturalgiftGiftOf(pokemon: any): NaturalgiftGift | null {
        return naturalgiftGiftByItem(pokemon ? String(pokemon.heldItem()) : "");
    }
    export interface NaturalgiftHeld { gift: NaturalgiftGift; held: NativeItems.Held; }
    /** 现场持物与恩赐；空手、不在表里或没有持物时返回 null（含原版生物/玩家的手）。 */
    export function naturalgiftHeld(world: CombatWorld, actor: CombatActor): NaturalgiftHeld | null {
        var held = NativeItems.heldOf(world, actor);
        if (held === null) return null;
        var gift = naturalgiftGiftByItem(held.id);
        return gift ? { gift: gift, held: held } : null;
    }
    /** 现场物品路径：有 pokemon 时读其携带物；只有 world+actor 时走统一装备读取（含原版生物/玩家的手）。 */
    function naturalgiftHeldPath(context: any): string {
        if (context && context.pokemon) return String(context.pokemon.heldItem());
        if (context && context.world && context.actor && context.world.valid(context.actor)) {
            var held = NativeItems.heldOf(context.world, context.actor);
            return held === null ? "" : held.id;
        }
        return "";
    }
    defineFacts("naturalgift", function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "gift.power") {
                    var gift = naturalgiftGiftByItem(naturalgiftHeldPath(context));
                    return gift ? gift.power : undefined;
                }
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "gift.power") return undefined;
                var gift = naturalgiftGiftByItem(naturalgiftHeldPath(context));
                return gift ? { value: gift.power, label: { key: "worldcombat.skill.naturalgift.value.gift" }, terms: [] } : undefined;
            }
        };
    });

    actionParameters.define("naturalgift", {
        // 威力 = 树果基础值 × 细嚼系数 + 物攻成长；取整与限幅一起进公式。
        gift: formula(
            F.var("gift.power", { key: "worldcombat.skill.naturalgift.value.gift" })
                .times(F.when(F.pref("savor"), F.const(1.3), F.const(1)))
                .plus(F.stat("attack").minus(60).times(0.18))
                .clamp(30, 160).round(1),
            "威力", { base: 80, unit: "威力", description: "树果决定基础威力，物攻补足；细嚼 ×1.3。对手防御、相性与暴击在命中时另算。" }),
        // 咀嚼时间：速度快咬得早，细嚼额外拖长，是可被打断的代价。
        charge: seconds(
            F.base(8).minus(F.stat("speed").minus(40).max(0).times(0.05))
                .plus(F.when(F.pref("savor"), F.const(8), F.const(0)))
                .clamp(4, 18).round(0),
            "咀嚼时间", "把树果嚼碎、让元素浮上体表要多久；越快咬得越快，细嚼更久。"),
        // 突进距离：速度决定这一步够得到多远。
        reach: formula(
            F.base(3.4).plus(F.stat("speed").minus(40).max(0).times(0.02)).clamp(3, 5).round(2),
            "突进距离", { unit: " 格", description: "一步踏到对手面前的距离；速度越快够得越远。" }),
        // 突进速度：手感随速度轻微变化。
        step: formula(
            F.base(0.45).plus(F.stat("speed").minus(40).max(0).times(0.003)).clamp(0.32, 0.7).round(2),
            "突进速度", { unit: " 格/刻", description: "这一步迈得多急。" }),
        // 判定半径：碰撞箱宽度决定借力面。
        radius: formula(
            F.base(0.28).plus(F.body("width").times(0.28)).clamp(0.26, 0.65).round(2),
            "判定半径", { unit: " 格", description: "身体越宽，撞上去的判定面越大。" }),
        // 命中顶开：体重决定推距。
        push: formula(
            F.base(0.18).plus(F.body("weight").div(10).times(0.02)).clamp(0.12, 0.6).round(2),
            "命中顶开", { unit: " 格", description: "体重越大，目标被顶得越远。" }),
        // 果屑数量：直接驱动命中粒子，随树果威力增长。
        bursts: formula(
            F.var("gift.power", { key: "worldcombat.skill.naturalgift.value.gift" }).div(6).plus(6).clamp(8, 34).round(0),
            "果屑数量", { unit: " 个", description: "命中时迸出的果屑数量，随树果威力增长；粒子按它发射。" }),
        // 元素光晕直径：随树果威力轻微变大，给命中一个可读的尺度。
        halo: formula(
            F.var("gift.power", { key: "worldcombat.skill.naturalgift.value.gift" }).div(160).plus(0.7).clamp(0.7, 1.4).round(2),
            "元素光晕", { unit: " 格", description: "命中处那口元素的扩散直径，随树果威力增长。" }),
        traceAhead: hidden(1.6),
        minimumMove: hidden(0.05)
    });

    defineDamage("naturalgift", "gift", { defenceCoefficient: 0.0045, rationale: "果肉借力一击穿透略强，让树果与物攻的差别更可见。" }, {
        resolve: function (damage: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            var gift = naturalgiftGiftByItem(naturalgiftHeldPath(damage));
            return gift ? { type: gift.type } : undefined;
        }
    });
    describe("naturalgift", [
        { key: "description.0", values: ["gift"] },
        { key: "description.consume", values: [] },
        { key: "description.1", values: ["charge","reach"] },
        { key: "description.push", values: ["push"] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] }
    ]);
}
