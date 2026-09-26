/**
 * 怒牛 / ragingbull 的参数、形态属性与伤害段。
 *
 * 原生事实：Normal／物理／威力 90／命中 100／PP 10／接触；属性随形态改变——
 *   肯泰罗·帕底亚的样子（战斗）→ Fighting、火种 → Fire、水种 → Water；出手时移除对手一侧的
 *   反射壁、光墙与极光幕。Cobblemon 1.8，4 位学习者。
 * 核心念头：低头压角，整副身板沿直线冲出去，撞开路上的一切；身体真实扫过的屏障随冲势一起碎。
 *   位移本身是武器，也是它和其他三招最大的区别。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   ram        冲撞威力：物攻给牛劲，速度给冲势，体重给质量。
 *   charge     冲锋距离：速度决定冲得多远，体重决定压得动多远。
 *   gallop     冲锋速度：速度决定每刻推进多快。
 *   collisionRadius 牛身半径：碰撞箱高度决定实际扫过的胶囊多粗。
 *   shove      顶开距离：体重决定把目标顶开多远。
 *   wardBreak  碎壁半径：体重决定撞中活体时额外震碎多广的一片屏障（身体扫过的屏另外单独碎）。
 *   tempo／aftercast／recharge 时序：速度决定起势、收势与再冲的等待。
 * 配置 trample（贯穿式）：一路撞穿、最多能撞到四个目标，但每一下 ×0.9、顶开更远、冷却 +8 刻；
 *   猛停式只撞第一个目标、单下 ×1.1、顶得更近。
 *
 * 形态属性：帕底亚的战斗／火种／水种分别给出 Fighting／Fire／Water，其余形态（含非肯泰罗）为 Normal；
 * 属性决定命中属性、本系加成与相性，也决定表现主色。
 *
 * 伤害段 ram：牛角撞实的那一下。
 */
namespace PokemonSkills {
    export const ragingbullColors: { [type: string]: number } = {
        normal: 0xC8C8C0, fighting: 0xC03028, fire: 0xF08030, water: 0x5090E8
    };
    /** 施法者的形态决定本招属性：帕底亚的战斗／火种／水种，其余为普通。 */
    export function ragingbullTypeOf(pokemon: CombatPokemon): string {
        if (typeof pokemon.aspect === "function") {
            if (pokemon.aspect("blaze-breed")) return "fire";
            if (pokemon.aspect("aqua-breed")) return "water";
        }
        const form = String(pokemon.form()).toLowerCase();
        if (form.indexOf("paldea") >= 0 || typeof pokemon.aspect === "function" && pokemon.aspect("paldean")) {
            if (form.indexOf("blaze") >= 0) return "fire";
            if (form.indexOf("aqua") >= 0) return "water";
            return "fighting";
        }
        return "normal";
    }
    export function ragingbullColorOf(pokemon: CombatPokemon): number {
        return ragingbullColors[ragingbullTypeOf(pokemon)] || 0xC8C8C0;
    }
    export function ragingbullSource(damage: PokemonDamage.FeatureContext): CombatPokemon | null {
        if (damage.actor && String(damage.actor.domain()) === "cobblemon") return CobblemonCombat.pokemon(damage.actor);
        const native = damage.sourceFacts.data.native;
        return native && native.pokemon ? <CombatPokemon>native.pokemon : null;
    }

    actionParameters.define("ragingbull", {
        /** 冲撞威力：基础 84，物攻每比 60 多 1 加 0.4（上限 +40），速度每比 55 快 1 加 0.1（上限 +14），体重每比 1000 重 1 加 0.004（上限 +20）；贯穿 ×0.9 / 猛停 ×1.1；夹 58..150。 */
        ram: formula(
            F.base(84)
                .plus(F.stat("attack").minus(60).times(0.4).clamp(-14, 40))
                .plus(F.stat("speed").minus(55).times(0.1).clamp(-4, 14))
                .plus(F.body("weight").minus(1000).times(0.004).clamp(-6, 20))
                .times(F.when(F.pref("trample", text("worldcombat.skill.ragingbull.preference.trample")), F.const(0.9), F.const(1.1)))
                .clamp(58, 150).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "整副身板沿直线撞实的基础威力；物攻给牛劲、速度给冲势、体重给质量。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲锋距离：基础 5 格，速度每比 55 快 1 加 0.025（上限 +1.4），体重每比 1000 重 1 加 0.002（上限 +0.9）；夹 4..8.5。 */
        charge: formula(
            F.base(5)
                .plus(F.stat("speed").minus(55).times(0.025).clamp(-0.6, 1.4))
                .plus(F.body("weight").minus(1000).times(0.002).clamp(-0.3, 0.9))
                .clamp(4, 8.5).round(2),
            "冲锋距离", {
                unit: "格",
                description: "从起步到撞停最多冲出的直距；快、重的个体冲得更远。它也是本招的实际射程来源。"
            }),
        /** 冲锋速度：基础 0.7 格/刻，速度每比 55 快 1 加 0.006（上限 +0.35）；夹 0.55..1.1。 */
        gallop: formula(
            F.base(0.7)
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.1, 0.35))
                .clamp(0.55, 1.1).round(2),
            "冲锋速度", {
                unit: "格/刻",
                description: "冲出去时每刻前进的距离；快的个体蹄下留不住。"
            }),
        /** 牛身半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.16（上限 +0.45）；夹 0.36..0.95。 */
        collisionRadius: formula(
            F.base(0.5)
                .plus(F.body("height").minus(1.4).times(0.16).clamp(-0.1, 0.45))
                .clamp(0.36, 0.95).round(2),
            "牛身半径", {
                unit: "格",
                description: "低头冲出去时判定撞上活体的横向半径；身体越大撞面越大。"
            }),
        /** 顶开距离：基础 0.7 格，体重每比 1000 重 1 加 0.0008（上限 +0.8）；贯穿 ×1.2 / 猛停 ×0.85；夹 0.3..1.6。 */
        shove: formula(
            F.base(0.7)
                .plus(F.body("weight").minus(1000).times(0.0008).clamp(-0.2, 0.8))
                .times(F.when(F.pref("trample", text("worldcombat.skill.ragingbull.preference.trample")), F.const(1.2), F.const(0.85)))
                .clamp(0.3, 1.6).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞实后把目标沿冲势顶开的距离；越重顶得越远，贯穿式顺势把目标甩得更开。"
            }),
        /** 碎壁半径：基础 8 格，体重每比 1000 重 1 加 0.001（上限 +2.5）；夹 8..10.5。 */
        wardBreak: formula(
            F.base(8)
                .plus(F.body("weight").minus(1000).times(0.001).clamp(-0.5, 2.5))
                .clamp(8, 10.5).round(2),
            "碎壁半径", {
                unit: "格",
                description: "撞中活体时额外震碎屏障的范围；此外身体真实扫过的光幕都会直接碎掉。被屏障护住的一整簇目标会失去反射壁、光墙与极光幕，越重的个体震得越广。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 少 0.04（上限 −1.5）；夹 4..12。 */
        tempo: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 2.5))
                .clamp(4, 12).round(0),
            "起手", "低头压角、蹬地起步需要多久；速度越快抬蹄越短。"),
        /** 收招：基础 10 刻，速度每比 55 快 1 少 0.03（上限 −1.5）；夹 5..14。 */
        aftercast: seconds(
            F.base(10)
                .minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5))
                .clamp(5, 14).round(0),
            "收招", "冲完刹住、转身回架势的时间；冲得越猛收得越久。"),
        /** 冷却：基础 34 刻，速度每比 55 快 1 少 0.08（上限 −3）；贯穿 +8；夹 20..56。 */
        recharge: seconds(
            F.base(34)
                .minus(F.stat("speed").minus(55).times(0.08).clamp(-3, 6))
                .plus(F.when(F.pref("trample", text("worldcombat.skill.ragingbull.preference.trample")), F.const(8), F.const(0)))
                .clamp(20, 56).round(0),
            "冷却", "两次怒牛之间的等待；贯穿式冲得更远、缓得更久。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage("ragingbull", "ram", {}, {
        contact: true,
        resolve: function (damage: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            const pokemon = ragingbullSource(damage);
            return pokemon ? { type: ragingbullTypeOf(pokemon) } : undefined;
        }
    });

    stages("ragingbull", [
        { level: 30, values: { ram: 94 } },
        { level: 48, values: { ram: 104, charge: 6 } }
    ]);

    describe("ragingbull", [
        { key: "description.0", values: ["ram","collisionRadius"] },
        { key: "description.1", values: ["charge","gallop","shove","wardBreak"] },
        { key: "trample.on", values: [], when: function (context) { return read(context.detail.values, ["trample"]) === true; } },
        { key: "trample.off", values: [], when: function (context) { return read(context.detail.values, ["trample"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ram"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ram", "tier.1.charge"] }
    ]);
}
