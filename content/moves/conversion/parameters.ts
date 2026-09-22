/**
 * Conversion (纹理) — 招式的元招式家族。
 *
 * 核心念头：读自己招式表里第一个招式的属性，把身体重织成那个属性。招式池是材料，身体是介质，
 * 结果落在自己身上。原生数据：`this.dex.moves.get(target.moveSlots[0].id).type`（Showdown conversion
 * onHit）；若已拥有该属性则失败。即时化后属性是真实的原生属性覆盖（NativeModifiers 的 types 层，
 * 与特性 multitype 同一机制），持续时间由数据决定。
 *
 * 每个参数都是一棵公式，出招时求值、悬浮时展开。依赖分散在等级、特攻、特防、速度上：
 * - charge 读取属性所需时间，走得快的个体更快抬起身；
 * - hold 属性维持时长，等级与特防支撑重织的稳定；
 * - afterglow 重织后的收势；
 * - recharge 重新编织的冷却，速度快的个体更快恢复；
 * - shades 只是表现条数，随特攻增长，让画面里的光带数量跟着个体走。
 */
namespace PokemonSkills {
    actionParameters.define("conversion", {
        charge: seconds(
            F.const(6).plus(F.level().div(45)).minus(F.stat("speed").div(110)).clamp(2, 12).round(),
            "纹理读取"),
        afterglow: seconds(
            F.const(8).plus(F.level().div(60)).clamp(5, 16).round(),
            "纹理稳定"),
        recharge: seconds(
            F.const(70).minus(F.stat("speed").times(0.35)).clamp(30, 120).round(),
            "重新编织"),
        hold: seconds(
            F.const(200).plus(F.level().times(4)).plus(F.stat("specialDefence").div(3)).clamp(160, 1200).round(),
            "纹理维持"),
        shades: formula(
            F.const(6).plus(F.stat("specialAttack").div(60)).clamp(6, 18).round(),
            "纹样条数")
    });

    describe("conversion", [
        { key: "description.0", values: ["charge"] },
        { key: "description.1", values: ["hold"] },
        { key: "description.2", values: ["recharge", "shades"] }
    ]);
}
