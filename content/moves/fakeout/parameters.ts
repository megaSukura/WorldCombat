/** 短踏步后双掌合击；本场第一次动作可用，伤害与控制独立按实际命中结算。 */
namespace PokemonSkills {
    export const fakeoutId = "fakeout";
    export const fakeoutScene = "world_combat:move_fakeout";
    export const fakeoutDazeEffect = "world_combat:fakeout_daze";

    /** The first committed action of an actual encounter, shared with ordinary native attacks. */
    export function fakeoutFresh(world: CombatWorld, actor: CombatActor): boolean {
        return CombatEncounters.first(world, actor);
    }
    CombatEncounters.views.define({
        id: "world_combat:fakeout/opening",
        apply: view => CombatEncounters.cue(view, "fakeout:opening", fakeoutScene,
            view.first && NativeLoadout.hasEquipped(view.world, view.actor, fakeoutId))
    });

    actionParameters.define(fakeoutId, {
        /** 掌掴威力：30 +（物攻 − 60）× 0.22 [−10,18] +（速度 − 55）× 0.12 [−5,14]；佯攻 ×0.85 / 硬拍 ×1.12；夹 22..96。 */
        swat: formula(
            F.base(30)
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-10, 18))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-5, 14))
                .times(F.when(F.pref("feint", text("worldcombat.skill.fakeout.preference.feint")), F.const(0.85), F.const(1.12)))
                .clamp(22, 96).round(1),
            "掌掴威力", {
                unit: "威力",
                description: "这一记掌掴的威力；物攻给份量、速度给抢手。佯攻式拍得轻，换来更长的懵。对手防御、相性与暴击在命中时另算。"
            }),
        blink: formula(F.base(0.6).plus(F.stat("speed").minus(55).times(0.006)).clamp(0.4, 1.2).round(2),
            "踏步距离", { unit: "格", description: "拍掌前的一次短踏步；随后由双掌触及前方目标。" }),
        palmReach: formula(F.base(0.7).plus(F.body("width").times(0.5)).round(2),
            "掌击距离", { unit: "格", description: "踏步停下后从身体中心向前拍掌的距离，随真实体宽变化。" }),
        /** 每刻位移：1.3 +（速度 − 55）× 0.006 [−0.2,0.5]；夹 0.9..2.0。 */
        speed: formula(
            F.base(1.3).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.5)).clamp(0.9, 2.0).round(2),
            "闪身速度", { unit: "格/刻", description: "闪过去每刻移动的距离；快到看不出中间过程，这就是「先制」。"
            }),
        /** 判定半径：0.4 +（身高 − 1.4）× 0.1 [−0.08,0.26]；夹 0.34..0.7。 */
        collisionRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.26)).clamp(0.34, 0.7).round(2),
            "判定半径", { unit: "格", description: "掌风能拍到多大一圈；身板大的个体出手略宽，不容易被侧身让开。" }),
        /** 拍懵持续：18 +（等级 − 30）× 0.5 [0,24]；佯攻 ×1.35 / 硬拍 ×0.9；夹 12..60 刻。 */
        dazeTicks: seconds(
            F.base(18).plus(F.level().minus(30).times(0.5).clamp(0, 24))
                .times(F.when(F.pref("feint", text("worldcombat.skill.fakeout.preference.feint")), F.const(1.35), F.const(0.9)))
                .clamp(12, 60).round(0),
            "拍懵持续", "被拍懵的人这段时间内无法开始新动作，正在执行的那一手也会被打断；等级越高按得越久，佯攻式更久。"),
        /** 起手：2 −（速度 − 55）× 0.01 [−0.3,0.6] − 佯攻 1；夹 1..4 刻。 */
        tempo: seconds(
            F.base(2).minus(F.stat("speed").minus(55).times(0.01).clamp(-0.3, 0.6))
                .minus(F.when(F.pref("feint", text("worldcombat.skill.fakeout.preference.feint")), F.const(1), F.const(0)))
                .clamp(1, 4).round(0),
            "起手", "从起念到掌掴贴上之间的时间；几乎瞬发，这就是「先制」。"),
        /** 收招：6 −（速度 − 55）× 0.03 [−1,2]；夹 4..10 刻。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "掌收回身位的时间；快的人更快拉开，免得挨反手。"),
        /** 冷却：34 −（速度 − 55）× 0.08 [−3,5] + 佯攻 4；夹 22..50 刻。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.08).clamp(-3, 5))
                .plus(F.when(F.pref("feint", text("worldcombat.skill.fakeout.preference.feint")), F.const(4), F.const(0)))
                .clamp(22, 50).round(0),
            "冷却", "这一记之后多久能再抢一次；本招真正的一次性来自「刚出场」，冷却只是别让人连着拍。"),
        minimumMove: hidden(0.05)
    });

    defineDamage(fakeoutId, "swat", { defenceCoefficient: 0.005,
        rationale: "轻快的掌掴；击掌奇袭以抢手与打断为主，份量轻。" }, { contact: true });

    stages(fakeoutId, [
        { level: 25, values: { swat: 34 } },
        { level: 45, values: { swat: 48, dazeTicks: 34 } }
    ]);

    describe(fakeoutId, [
        { key: "description.0", values: ["swat"] },
        { key: "description.1", values: ["blink","speed","collisionRadius","palmReach"] },
        { key: "description.2", values: ["dazeTicks"] },
        { key: "feint.on", values: [], when: function (context) { return read(context.detail.values, ["feint"]) === true; } },
        { key: "feint.off", values: [], when: function (context) { return read(context.detail.values, ["feint"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.swat"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.swat", "tier.1.dazeTicks"] }
    ]);

}
