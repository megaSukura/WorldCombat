/**
 * 投掷 / fling —— 参数、伤害段与道具读取。
 *
 * 核心念头：把手里的东西整个甩出去，它飞出去、砸在目标身上，然后落在地上留在世界里——谁都能捡。
 * 威力随道具不同（铁球最重、树果最轻），效果也随道具不同：树果被对方吃掉、火珠烫伤、毒针中毒、
 * 王冠让对手一窒；不是消耗品的普通道具就只是一记重物。
 *
 * 数值来源（原生）：Dark／物理／命中 100／PP 10；威力与效果取自携带道具（Showdown items.js 的
 * fling 表：basePower 0–130，部分带 status／volatileStatus）。表里 152 件 Cobblemon 道具全部收录，
 * 树果统一为 10。原生固定值只作公式起点：投掷距离、飞行速度、判定、顶开分别读不同精灵数据。
 *
 * 事实接入：道具的投掷威力是自定义纯事实 `fling.power`（`defineFacts`），供威力公式与悬浮共用；
 * 道具的效果（状态／烫伤／一窒）在执行时读出并随命中落地。
 */
namespace PokemonSkills {
    export interface FlingItem { power: number; status: string; flinch: boolean; berry: boolean; }
    /** Cobblemon 物品路径 -> [原投掷威力, 附加效果码]；空效果为 "。 */
    const flingTable: { [item: string]: [number, string] } = {
        "ability_shield": [30, ""], "absorb_bulb": [30, ""], "air_balloon": [10, ""],
        "armor_fossil": [100, ""], "assault_vest": [80, ""], "auspicious_armor": [30, ""],
        "berry_juice": [30, ""], "berry_sweet": [10, ""], "big_root": [10, ""],
        "binding_band": [30, ""], "black_belt": [30, ""], "black_glasses": [30, ""],
        "black_sludge": [30, ""], "blunder_policy": [80, ""], "bright_powder": [10, ""],
        "cell_battery": [30, ""], "chipped_pot": [80, ""], "choice_band": [10, ""],
        "choice_scarf": [10, ""], "choice_specs": [10, ""], "claw_fossil": [100, ""],
        "clear_amulet": [30, ""], "clover_sweet": [10, ""], "cover_fossil": [100, ""],
        "covert_cloak": [30, ""], "cracked_pot": [80, ""], "damp_rock": [60, ""],
        "dawn_stone": [80, ""], "deep_sea_scale": [30, ""], "deep_sea_tooth": [90, ""],
        "destiny_knot": [10, ""], "dome_fossil": [100, ""], "dragon_fang": [70, ""],
        "dragon_scale": [30, ""], "dubious_disc": [50, ""], "dusk_stone": [80, ""],
        "eject_button": [30, ""], "eject_pack": [50, ""], "electirizer": [80, ""],
        "electric_seed": [10, ""], "eviolite": [40, ""], "expert_belt": [10, ""],
        "fairy_feather": [10, ""], "fire_stone": [30, ""], "flame_orb": [30, "brn"],
        "float_stone": [30, ""], "flower_sweet": [0, ""], "focus_band": [10, ""],
        "focus_sash": [10, ""], "fossilized_bird": [100, ""], "fossilized_dino": [100, ""],
        "fossilized_drake": [100, ""], "fossilized_fish": [100, ""], "galarica_cuff": [30, ""],
        "galarica_wreath": [30, ""], "grassy_seed": [10, ""], "grip_claw": [90, ""],
        "hard_stone": [100, ""], "heat_rock": [60, ""], "heavy_duty_boots": [80, ""],
        "helix_fossil": [100, ""], "ice_stone": [30, ""], "icy_rock": [40, ""],
        "iron_ball": [130, ""], "jaw_fossil": [100, ""], "kings_rock": [30, "flinch"],
        "lagging_tail": [10, ""], "leaf_stone": [30, ""], "leftovers": [10, ""],
        "life_orb": [30, ""], "light_ball": [30, "par"], "light_clay": [30, ""],
        "loaded_dice": [30, ""], "love_sweet": [10, ""], "luminous_moss": [30, ""],
        "magmarizer": [80, ""], "magnet": [30, ""], "malicious_armor": [30, ""],
        "masterpiece_teacup": [80, ""], "mental_herb": [10, ""], "metal_coat": [30, ""],
        "metal_powder": [10, ""], "metronome": [30, ""], "miracle_seed": [30, ""],
        "mirror_herb": [30, ""], "misty_seed": [10, ""], "moon_stone": [30, ""],
        "muscle_band": [10, ""], "mystic_water": [30, ""], "never_melt_ice": [30, ""],
        "oval_stone": [80, ""], "plume_fossil": [100, ""], "poison_barb": [70, "psn"],
        "power_anklet": [70, ""], "power_band": [70, ""], "power_belt": [70, ""],
        "power_bracer": [70, ""], "power_herb": [10, ""], "power_lens": [70, ""],
        "power_weight": [70, ""], "prism_scale": [30, ""], "protective_pads": [30, ""],
        "protector": [80, ""], "psychic_seed": [10, ""], "punching_glove": [30, ""],
        "quick_claw": [80, ""], "quick_powder": [10, ""], "razor_claw": [80, ""],
        "razor_fang": [30, "flinch"], "reaper_cloth": [10, ""], "red_card": [10, ""],
        "ribbon_sweet": [10, ""], "ring_target": [10, ""], "rocky_helmet": [60, ""],
        "room_service": [100, ""], "root_fossil": [100, ""], "sachet": [80, ""],
        "safety_goggles": [80, ""], "sail_fossil": [100, ""], "scope_lens": [30, ""],
        "sharp_beak": [50, ""], "shed_shell": [10, ""], "shell_bell": [30, ""],
        "shiny_stone": [80, ""], "silk_scarf": [10, ""], "silver_powder": [10, ""],
        "skull_fossil": [100, ""], "smooth_rock": [10, ""], "soft_sand": [10, ""],
        "spell_tag": [30, ""], "star_sweet": [10, ""], "sticky_barb": [80, ""],
        "strawberry_sweet": [10, ""], "sun_stone": [30, ""], "sweet_apple": [30, ""],
        "syrupy_apple": [30, ""], "tart_apple": [30, ""], "terrain_extender": [60, ""],
        "throat_spray": [30, ""], "thunder_stone": [30, ""], "toxic_orb": [30, "tox"],
        "twisted_spoon": [30, ""], "unremarkable_teacup": [80, ""], "upgrade": [30, ""],
        "utility_umbrella": [60, ""], "water_stone": [30, ""], "weakness_policy": [80, ""],
        "whipped_dream": [80, ""], "white_herb": [10, ""], "wide_lens": [10, ""],
        "wise_glasses": [10, ""], "zoom_lens": [10, ""]
    };
    function flingKey(id: string): string {
        var value = String(id || "").toLowerCase(), split = value.indexOf(":");
        return split < 0 ? value : value.slice(split + 1);
    }
    /** 读出携带道具的投掷数据；空手返回 null。树果统一投掷威力 10，并在命中时被对方吃掉。 */
    export function flingItemOf(pokemon: any): FlingItem | null {
        if (!pokemon) return null;
        var held = String(pokemon.heldItem());
        if (!held) return null;
        if (typeof pokemon.heldTag === "function" && pokemon.heldTag("cobblemon:berries"))
            return { power: 10, status: "", flinch: false, berry: true };
        var entry = flingTable[flingKey(held)];
        if (!entry) return { power: 30, status: "", flinch: false, berry: false };
        return { power: entry[0], status: entry[1], flinch: entry[1] === "flinch", berry: false };
    }
    function flingPokemon(context: any): CombatPokemon | null {
        if (context && context.pokemon) return context.pokemon;
        if (context && context.world && context.actor && context.world.valid(context.actor)
            && String(context.actor.domain()) === "cobblemon") return CobblemonCombat.pokemon(context.actor);
        return null;
    }
    defineFacts("fling", function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "fling.power") { var item = flingItemOf(flingPokemon(context)); return item ? item.power : undefined; }
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "fling.power") return undefined;
                var item = flingItemOf(flingPokemon(context));
                return item ? { value: item.power, label: { key: "worldcombat.skill.fling.value.item" }, terms: [] } : undefined;
            }
        };
    });

    actionParameters.define("fling", {
        // 威力 = 道具投掷基础值 + 物攻成长；不留下道具（摔碎）时 ×1.2。
        throw: formula(
            F.var("fling.power", { key: "worldcombat.skill.fling.value.item" })
                .plus(F.stat("attack").minus(60).times(0.15))
                .times(F.when(F.pref("leave"), F.const(1), F.const(1.2)))
                .clamp(20, 170).round(1),
            "威力", { base: 50, unit: "威力", description: "道具决定基础威力，物攻补足；摔碎不留下道具时 ×1.2。对手防御、相性与暴击在命中时另算。" }),
        // 甩腕时间：速度快甩得早。
        charge: seconds(
            F.base(7).minus(F.stat("speed").minus(40).max(0).times(0.04)).clamp(4, 12).round(0),
            "甩腕时间", "把道具甩出去之前的蓄力；手快的人起手更短。"),
        // 投掷距离：攻击越高甩得越远。
        reach: formula(
            F.base(10).plus(F.stat("attack").minus(60).max(0).times(0.03)).clamp(8, 16).round(1),
            "投掷距离", { unit: " 格", description: "能甩到多远；力量越大越远。" }),
        // 飞行速度：速度决定初速。
        speed: formula(
            F.base(1.1).plus(F.stat("speed").minus(40).max(0).times(0.006)).clamp(0.9, 1.7).round(2),
            "飞行速度", { unit: " 格/刻", description: "道具飞出去的初速；越快越难躲。" }),
        // 判定半径：体型高度决定抛出物的判定，也照顾大个子。
        radius: formula(
            F.base(0.26).plus(F.body("height").minus(1.4).max(0).times(0.08)).clamp(0.22, 0.5).round(2),
            "判定半径", { unit: " 格", description: "飞行物的碰撞半径；高个子的投掷判定略大。" }),
        // 命中顶开：体重决定推距。
        push: formula(
            F.base(0.15).plus(F.body("weight").div(10).times(0.02)).clamp(0.1, 0.5).round(2),
            "命中顶开", { unit: " 格", description: "体重越大，目标被撞得越远。" }),
        // 碎屑数量：直接驱动命中粒子，随威力增长。
        bursts: formula(
            F.var("fling.power", { key: "worldcombat.skill.fling.value.item" }).div(5).plus(8).clamp(8, 40).round(0),
            "碎屑数量", { unit: " 个", description: "命中时迸出的碎屑数量，随道具威力增长；粒子按它发射。" }),
        // 落地回收延迟：越重的东西落地越久才能被捡起。
        pickup: seconds(
            F.var("fling.power", { key: "worldcombat.skill.fling.value.item" }).div(20).plus(10).clamp(10, 30).round(0),
            "落地可拾取延迟", "留下的道具要过多久才能被捡起；越重的东西落地越久。"),
        gravity: hidden(0.02)
    });

    defineDamage("fling", "throw", { defenceCoefficient: 0.0046, rationale: "重物投掷穿透略强，让道具与物攻的差别更可见。" }, { contact: false });
    describe("fling", [
        { key: "description.0", values: ["throw"] },
        { key: "description.1", values: ["reach","charge"] },
        { key: "description.projectile", values: ["speed","radius","push"] },
        { key: "description.2", values: ["pickup"] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] }
    ]);
}
