/**
 * 屏障猛攻 / psyshieldbash 的参数与伤害段。
 *
 * 原生事实：Psychic、物理、威力 70、命中 90、PP 10、接触、使用后自身防御 +1（100%）（Cobblemon 1.8，2 位学习者）。
 * 翻译：把「让意念的能量覆盖全身，撞向对手，并提高自己的防御」做成**先结壳、再撞、壳碎回卷加固**——
 * 起手把意念编成一层半透明的护盾裹住全身（这一层就是那次防御提升，提交即生效），带着盾撞过去；
 * 撞实的一刻壳在接触点炸成片，碎片回卷重新合拢，把使用者再加固一级。
 * **三项数据分工**：撞击威力看特攻（意念的强度）与少量物攻；冲撞速度与偏角看速度；壳的半径与加固时长看防御；
 * 命中 90 落成“瞄准会偏”（`wobble`），偏开了也只损失伤害——壳已经成形，防御照拿。
 * 配置 harden（深凝式）把壳编得更厚：防御 +2、壳更持久，但威力更低、冲得更慢；速攻式相反。
 *
 * 伤害段名 bash：这一撞随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("psyshieldbash", {
        /** 撞击威力：特攻每比 60 多 1 加 0.34（上限 +40），攻击每比 60 多 1 加 0.1（上限 +14）；深凝 ×0.88 / 速攻 ×1.05；夹在 42..140。 */
        bash: formula(
            F.base(68).plus(F.stat("specialAttack").minus(60).times(0.34).clamp(-14, 40))
                .plus(F.stat("attack").minus(60).times(0.1).clamp(-4, 14))
                .times(F.when(F.pref("harden", text("worldcombat.skill.psyshieldbash.preference.harden")), F.const(0.88), F.const(1.05)))
                .clamp(42, 140).round(1),
            "撞击威力", {
                unit: "威力",
                description: "带着护盾撞上去的基础威力；特攻给出意念的强度，身体再补一点。深凝式把力道分给护盾，撞得更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲撞距离：基础 3.6 格，速度每比 55 多 1 加 0.02（上限 +1.4）；夹在 3.0..5.6。 */
        charge: formula(
            F.base(3.6).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.5, 1.4)).clamp(3.0, 5.6).round(2),
            "冲撞距离", {
                unit: "格",
                description: "从起步到撞上的总位移；驱动目标接受范围。腿快的个体冲得更远。"
            }),
        /** 冲撞速度：基础 0.66 格/刻，速度每比 55 多 1 加 0.005（上限 +0.4）；深凝 ×0.92 / 速攻 ×1.04；夹在 0.45..1.2。 */
        dashSpeed: formula(
            F.base(0.66).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.4))
                .times(F.when(F.pref("harden", text("worldcombat.skill.psyshieldbash.preference.harden")), F.const(0.92), F.const(1.04)))
                .clamp(0.45, 1.2).round(2),
            "冲撞速度", {
                unit: "格/刻",
                description: "带着护盾冲出去时每刻前进的距离；厚壳拖慢一点。"
            }),
        /** 护盾半径：基础 0.48 格，防御每比 60 多 1 加 0.0032（上限 +0.35），碰撞箱每比 1.4 高 1 格加 0.1；夹在 0.4..0.95。 */
        shellRadius: formula(
            F.base(0.48).plus(F.stat("defence").minus(60).times(0.0032).clamp(-0.08, 0.35))
                .plus(F.body("height").minus(1.4).times(0.1))
                .clamp(0.4, 0.95).round(2),
            "护盾半径", {
                unit: "格",
                description: "裹住全身的护盾半径，也是撞上活体的判定半径；防御越高壳越厚，画面里的壳与它同大。"
            }),
        /** 防御提升：深凝式 +2 级，速攻式 +1 级。 */
        boostStages: formula(
            F.when(F.pref("harden", text("worldcombat.skill.psyshieldbash.preference.harden")), F.const(2), F.const(1)).round(0),
            "防御提升", {
                unit: "级",
                description: "护盾成形时给自己加几级防御；深凝式编得更厚。这一层在提交时就生效，撞空也照拿；随护盾结束而收回，重施刷新一层。"
            }),
        /** 护盾时长：基础 90 刻，等级每比 30 高 1 加 1.1 刻（上限 +50），防御每比 60 多 1 加 0.4 刻（上限 +20）；夹在 70..220。 */
        shellTicks: seconds(
            F.base(90).plus(F.level().minus(30).times(1.1).clamp(0, 50))
                .plus(F.stat("defence").minus(60).times(0.4).clamp(-10, 20))
                .clamp(70, 220).round(0),
            "护盾时长", "护盾留在身上、带共享身份 world_combat:status/psyshield 的时长；等级与防御越高挂得越久。"),
        /** 偏角：基础 9 度，速度每比 55 快 1 少 0.03 度（上限 −2）；夹在 2..12。 */
        wobble: formula(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 5)).clamp(2, 12).round(1),
            "偏角", {
                unit: "度",
                description: "出招时瞄准方向可能偏离的最大角度（原生命中 90）；速度快的个体压得住线。落点是否偏开属于随机结果。"
            }),
        /** 顶开距离：基础 0.32 格，体重每比 60 多 1 加 0.002（上限 +0.5）；夹在 0.12..0.8。 */
        push: formula(
            F.base(0.32).plus(F.body("weight").minus(60).times(0.002).clamp(-0.05, 0.5)).clamp(0.12, 0.8).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞实后把目标沿冲撞方向推开的距离。"
            }),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages("psyshieldbash", [
        { level: 28, values: { bash: 78 } },
        { level: 46, values: { bash: 88, shellTicks: 130 } }
    ]);

    defineDamage("psyshieldbash", "bash", { defenceCoefficient: 0.005 }, { contact: true });

    describe("psyshieldbash", [
        { key: "description.0", values: ["bash","push","shellRadius"] },
        { key: "description.1", values: ["charge","dashSpeed","wobble"] },
        { key: "description.2", values: ["boostStages","shellTicks"] },
        { key: "harden.on", values: [], when: function (context) { return read(context.detail.values, ["harden"]) === true; } },
        { key: "harden.off", values: [], when: function (context) { return read(context.detail.values, ["harden"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bash", "tier.1.shellTicks"] }
    ]);
}
