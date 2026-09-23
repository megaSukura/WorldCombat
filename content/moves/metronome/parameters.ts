/**
 * Metronome (挥指) — 招式的元招式家族。
 *
 * 核心念头：手指一搓，把整个可出招的招式库搅进自己身体，搅出哪一个就使出哪一个。招式池不是自己
 * 的招式表，而是这个引擎里所有已实装的招式；原生数据（Showdown metronome）按 flags.metronome
 * 过滤，缺这个旗标的招式（含本招自己）不会被搅出来。
 *
 * 参数分散在不同精灵数据上：
 * - wag 搓指时长，速度与等级让搅动更快；
 * - span 搅出的招式最多能到多远，速度与等级共同决定，同时是借用招式的射程上限；
 * - recharge 下次挥指的冷却，速度快的个体更快；
 * - hues 画面里的候选光点数量，随特攻增长；
 * - bias 是唯一配置项：全谱／偏近身／偏远程。偏向会收窄候选（失去“任意”），换来在当前距离更
 *   容易搅出能用的招式；不偏向则保留完整随机，也可能搅出打不到的招式。
 */
namespace PokemonSkills {
    actionParameters.define("metronome", {
        wag: seconds(
            F.const(8).plus(F.level().div(50)).minus(F.stat("speed").div(100)).clamp(3, 14).round(),
            "搓指时间"),
        span: formula(
            F.const(5).plus(F.stat("speed").div(24)).plus(F.level().div(14)).clamp(5, 20),
            "搅动距离"),
        recharge: seconds(
            F.const(100).minus(F.stat("speed").times(0.4)).clamp(50, 160).round(),
            "再次挥指"),
        hues: formula(
            F.const(6).plus(F.stat("specialAttack").div(50)).clamp(6, 20).round(),
            "候选光点")
    });

    describe("metronome", [
        { key: "description.0", values: ["wag"] },
        { key: "description.1", values: ["span","recharge"] },
        { key: "description.2", values: ["pref.bias"] },
        { key: "description.3", values: [] }
    ]);
}
