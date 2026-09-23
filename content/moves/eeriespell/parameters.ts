/** eeriespell：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    actionParameters.define("eeriespell", {
        // 精神强袭的强度：特攻越高越强。
        power: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).max(0).times(0.2)).clamp(48, 140).round(1),
            "威力", { unit: "威力", description: "原生 80 起，由特攻成长。" }),
        // 抽取的 PP：原样 3 点，只对宝可梦的最后一个招式生效。
        drain: formula(
            F.base(3),
            "抽取PP", { unit: " 点", description: "从目标最后使用的招式扣除。" }),
        // 记忆雾持续：等级越高念得越久。
        fuzzyTicks: seconds(
            F.base(120).plus(F.level().minus(20).max(0).times(1.5)).clamp(100, 240),
            "记忆雾持续", "目标带着「诡异」时，尝试出手可能失手。"),
        // 失手概率：由施法者特攻决定，作为效果等级随状态一起带上，行为侧按它掷骰。
        failChance: percent(
            F.base(0.18).plus(F.stat("specialAttack").minus(60).max(0).times(0.0008)).clamp(0.10, 0.35),
            "失手概率", "目标带着「诡异」时每次尝试出手的失手概率。"),
        // 咒语飞行速度：速度越高，记忆越难躲。
        boltSpeed: formula(
            F.base(1.8).plus(F.stat("speed").minus(40).max(0).times(0.006)).clamp(1.3, 2.8).round(2),
            "飞行速度", { unit: " 格/刻", description: "越快飞得越直。" }),
        // 判定粗细：体型越高越粗。
        collisionRadius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).max(0).times(0.10)).clamp(0.2, 0.5).round(2),
            "判定半径", { unit: " 格", description: "大个子凝出的咒念更粗。" })
    });
    defineDamage("eeriespell", "power", { defenceCoefficient: 0.0048, rationale: "精神强袭对防御穿透略强，让特攻差更明显。" }, { sound: true });
    describe("eeriespell", [
        { key: "description.0", values: ["power", "range"] },
        { key: "description.1", values: ["drain", "fuzzyTicks"] },
        { key: "description.2", values: ["failChance"] },
        { key: "timing", values: ["prepare", "recover", "cooldown", "pp"] }
    ]);
}
