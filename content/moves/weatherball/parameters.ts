/**
 * 气象球 / weatherball —— 参数、伤害段与天色读取。
 *
 * 核心念头：把此刻头顶的天色收进一颗球里再甩出去——雷雨是电、下雨是水、晴空是火、无天气就是一颗普通的球；
 * 只要天上有东西可收，这一球就更大更亮（威力 ×2）。球飞出去命中处炸开收集到的那口元素。
 *
 * 数值来源（原生）：Normal／特殊／威力 50／命中 100／PP 10；有天气时属性随天气、威力 ×2
 * （sunnyday/desolateland→Fire、raindance/primordialsea→Water、sandstorm→Rock、hail/snow→Ice）。
 * 世界化：先读共享的语义天气（内容声明，晴天／雨天／沙暴／雪等），再退回原版维度天气与日照——
 * 雷→电、雨→水、沙暴→岩、雪／冰雹→冰、晴空强日照→火，无天气→普通；属性与威力都按同一份天色读取。
 * 原生固定 50 只作公式起点。
 *
 * 事实接入：天色是否带电是自定义纯事实 `sky.charged`（`defineFacts`），供威力公式与悬浮共用；
 * 属性由同一读取器在伤害 `resolve` 里给出，预览与命中同源。
 */
namespace PokemonSkills {
    export interface WeatherballElement { type: string; colour: number; sound: string; }
    const weatherballElements: { [sky: string]: WeatherballElement } = {
        thunder: { type: "electric", colour: 0xF8D030, sound: "cobblemon:move.thunderbolt.target" },
        rain: { type: "water", colour: 0x6890F0, sound: "cobblemon:move.waterpulse.target" },
        sun: { type: "fire", colour: 0xF08030, sound: "cobblemon:move.ember.target" },
        sandstorm: { type: "rock", colour: 0xC8B078, sound: "cobblemon:impact.rock" },
        snow: { type: "ice", colour: 0x9AD0F0, sound: "cobblemon:impact.ice" },
        clear: { type: "normal", colour: 0xA8A878, sound: "cobblemon:move.quickattack.target" }
    };
    /** 内容声明的语义天气到本招元素的映射；未知天气交给原生天色。 */
    function weatherballSemantic(kind: string): string | null {
        if (kind === "thunder" || kind === "rain" || kind === "sun" || kind === "sandstorm") return kind;
        if (kind === "snow" || kind === "hail") return "snow";
        return null;
    }
    /** 读一个点的天色：语义天气优先，其次原版雷／雨／晴空强日照，其余 → 无。 */
    export function weatherballSkyAt(world: CombatWorld | null, point: CombatPoint | null): string {
        if (!world || !point) return "clear";
        var kind = WorldEnvironment.weather(world, point);
        if (kind !== null) { var mapped = weatherballSemantic(kind); if (mapped) return mapped; }
        var env = WorldEnvironment.read(world, point);
        if (!env || !env.loaded) return "clear";
        if (env.thunder > 0.05) return "thunder";
        if (env.rain > 0.05) return "rain";
        if (env.day && env.skyVisible && (env.skyLight || 0) >= 12) return "sun";
        return "clear";
    }
    export function weatherballElementOf(sky: string): WeatherballElement {
        return weatherballElements[sky] || weatherballElements.clear;
    }
    function weatherballPoint(context: any): CombatPoint | null {
        if (!context || !context.world) return null;
        var actor = context.actor;
        if (actor && context.world.valid(actor)) {
            var body = context.world.observe(actor);
            return body ? body.position() : null;
        }
        return null;
    }
    defineFacts("weatherball", function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "sky.charged") return weatherballSkyAt(context.world || null, weatherballPoint(context)) !== "clear";
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "sky.charged") return undefined;
                var sky = weatherballSkyAt(context.world || null, weatherballPoint(context));
                return { value: sky === "clear" ? 0 : 1, label: { key: "worldcombat.skill.weatherball.value.charged" }, terms: [] };
            }
        };
    });

    actionParameters.define("weatherball", {
        // 威力 = 50 + 特攻成长；天色可收时 ×2，贯穿时 ×0.75。
        orb: formula(
            F.base(50).plus(F.stat("specialAttack").minus(60).times(0.22))
                .times(F.when(F.var("sky.charged", { key: "worldcombat.skill.weatherball.value.charged" }), F.const(2), F.const(1)))
                .times(F.when(F.pref("pierce"), F.const(0.75), F.const(1)))
                .clamp(35, 180).round(1),
            "威力", { base: 50, unit: "威力", description: "天色可收时 ×2；贯穿时 ×0.75。对手防御、相性与暴击在命中时另算。" }),
        // 聚气时间：速度越快收得越快；天色可收时多收一会儿（更亮更大）。
        charge: seconds(
            F.base(10).minus(F.stat("speed").minus(40).max(0).times(0.05))
                .plus(F.when(F.var("sky.charged", { key: "worldcombat.skill.weatherball.value.charged" }), F.const(4), F.const(0)))
                .clamp(5, 18).round(0),
            "聚气时间", "把天色收进手里需要多久；手快的人更短，天色可收时多收一会儿。"),
        // 施放距离：特攻越高看得越远。
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).max(0).times(0.04)).clamp(10, 20).round(1),
            "施放距离", { unit: " 格", description: "能在多远之外把球甩到目标身上；特攻越高越远。" }),
        // 飞行速度：速度决定初速。
        velocity: formula(
            F.base(1.2).plus(F.stat("speed").minus(40).max(0).times(0.008)).clamp(1.0, 1.9).round(2),
            "飞行速度", { unit: " 格/刻", description: "球飞出去的初速；越快越难躲。" }),
        // 判定半径：体型高度决定球的判定。
        radius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).max(0).times(0.1)).clamp(0.26, 0.6).round(2),
            "判定半径", { unit: " 格", description: "球的碰撞半径；高个子的球略大。" }),
        // 爆发数量：直接驱动命中粒子，随威力增长。
        bursts: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).max(0).times(0.18))
                .times(F.when(F.var("sky.charged", { key: "worldcombat.skill.weatherball.value.charged" }), F.const(1.5), F.const(1)))
                .clamp(10, 48).round(0),
            "爆发数量", { unit: " 个", description: "命中处炸开的元素粒子数量；特攻越高、天色越满越密。粒子按它发射。" }),
        // 元素光晕：随威力放大命中范围的可读尺度。
        halo: formula(
            F.base(0.7).plus(F.stat("specialAttack").minus(60).max(0).times(0.004)).clamp(0.7, 1.5).round(2),
            "元素光晕", { unit: " 格", description: "命中处元素扩散的直径；特攻越高越大。" })
    });

    defineDamage("weatherball", "orb", { defenceCoefficient: 0.0048, rationale: "天气能量穿透略强，让天色与特攻的差别更可见。" }, {
        resolve: function (damage: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            if (!damage.world) return undefined;
            var body = damage.actor ? damage.world.observe(damage.actor) : null;
            return { type: weatherballElementOf(weatherballSkyAt(damage.world, body ? body.position() : null)).type };
        }
    });
    describe("weatherball", [
        { key: "description.0", values: ["orb"] },
        { key: "description.1", values: ["charge", "reach"] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] }
    ]);
}
