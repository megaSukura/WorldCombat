/**
 * Assist (借助) — 招式的元招式家族。
 *
 * 核心念头：向附近的伙伴发出一声呼唤，从它们已学会的招式中随机借一个来使出。招式池是身边队友，
 * 门槛是够得着伙伴；独行时没有东西可借。原生数据（Showdown assist）：遍历 side.pokemon（除去自己）
 * 的 moveSlots，过滤 flags.noassist 后随机 useMove。
 *
 * 参数分散在不同精灵数据上：
 * - call 呼唤所需时间，半径越大喊得越久（配置的双向代价），等级高、速度快的个体更快；
 * - radius 实际呼唤半径，由配置 callRadius 与等级共同决定；
 * - span 借出的招式最多够到多远，速度与等级共同决定；
 * - recharge 再次求助的冷却，速度快的个体更快；
 * - bonds 表现里的伙伴印记数量，随特攻增长；borrow 的爆发数量则取实际候选池大小。
 * - callRadius 是唯一配置项：呼唤得更远能借到更多伙伴，但要喊更久，且更容易把不合适的招式带回来。
 */
namespace PokemonSkills {
    actionParameters.define("assist", {
        call: seconds(
            F.const(4).plus(F.pref("callRadius").div(4)).plus(F.level().div(60)).minus(F.stat("speed").div(120)).clamp(3, 18).round(),
            "呼唤时间"),
        radius: formula(
            F.pref("callRadius").plus(F.level().div(20)).clamp(4, 24),
            "呼唤半径"),
        span: formula(
            F.const(4).plus(F.stat("speed").div(26)).plus(F.level().div(16)).clamp(4, 18),
            "借用距离"),
        recharge: seconds(
            F.const(95).minus(F.stat("speed").times(0.45)).clamp(45, 150).round(),
            "再次求助"),
        bonds: formula(
            F.const(4).plus(F.stat("specialAttack").div(70)).clamp(4, 16).round(),
            "伙伴印记")
    });

    describe("assist", [
        { key: "description.0", values: ["call"] },
        { key: "description.1", values: ["radius", "span"] },
        { key: "description.2", values: ["pref.callRadius"] },
        { key: "description.3", values: ["recharge", "bonds"] }
    ]);
}
