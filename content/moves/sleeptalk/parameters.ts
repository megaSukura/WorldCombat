/**
 * Sleep Talk (梦话) — 招式的元招式家族。
 *
 * 核心念头：睡着时把梦里浮出的一个已知招式说出口。招式池是自己的招式表，门槛是自己的睡眠，
 * 结果由那个被借出的招式决定。原生数据（Showdown sleeptalk）：sleepUsable、仅睡眠可用、
 * 从 moveSlots 里过滤 flags.nosleeptalk / flags.charge 后随机取一个 useMove。
 *
 * 参数分散在不同精灵数据上：
 * - murmur 呓语时长，速度与等级让出手更快；
 * - span 梦话能够到的距离，速度与等级共同决定，同时是借用招式的射程上限；
 * - recharge 再次入梦的冷却，速度快的个体更快；
 * - echoes 画面里的梦泡数量，随等级与特攻增长。
 */
namespace PokemonSkills {
    actionParameters.define("sleeptalk", {
        murmur: seconds(
            F.const(6).plus(F.level().div(40)).minus(F.stat("speed").div(120)).clamp(2, 12).round(),
            "呓语时间"),
        span: formula(
            F.const(6).plus(F.stat("speed").div(30)).plus(F.level().div(16)).clamp(6, 20),
            "梦话距离"),
        recharge: seconds(
            F.const(90).minus(F.stat("speed").times(0.5)).clamp(40, 140).round(),
            "再次入梦"),
        echoes: formula(
            F.const(4).plus(F.level().div(12)).plus(F.stat("specialAttack").div(80)).clamp(4, 20).round(),
            "梦泡数量")
    });

    describe("sleeptalk", [
        { key: "description.0", values: ["murmur"] },
        { key: "description.1", values: ["span","recharge"] }
    ]);
}
