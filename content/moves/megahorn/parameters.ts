/**
 * 超级角击 / megahorn 的参数与伤害段。
 *
 * 原生事实：Bug／物理／威力 120／命中 85／PP 10／优先度 0／接触，无追加效果（Cobblemon 1.8，31 位学习者）。
 * 描述「用坚硬且华丽的角狠狠地刺入对手进行攻击」。它是本族单发最重、射程最长的一记。
 *
 * 翻译：把「用角狠狠刺入」翻成**低角长蓄势后沿一条又长又窄的直线把角送进去**——起手很长、可被打断，正面只有
 * 一条很窄的角线，侧身或走开就能让这一记落空（原生 85% 命中在这里是位置判定，不再另掷骰子）。扎中最前面那个
 * 目标后分两种收法：**深植式**把角留在伤口里、目标被短暂钉住；**甩角式**第二拍把角猛甩出来，补一下并把目标
 * 向上向后抛飞。它是本族唯一会改变目标站位的重刺。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   gore       刺入威力：物攻定角尖、体重定冲量、等级给狠劲；深植式更重、甩角式分出一点给第二拍。
 *   reach      角刺射程：身高给角长与步幅，速度给上前的半步；深植式略收。
 *   horn       角线半宽：体宽决定角有多粗；深植式收窄以求扎准。
 *   charge     蓄势时长：速度决定低头蓄得多快，甩角式要多压一拍。
 *   rush       冲身步幅：速度给趟出去的冲程。
 *   rip        第二拍拔出伤害：物攻定甩脱的力度（仅甩角式）。
 *   fling      抛飞距离：施法者体重推得远、目标越高大越站得住（仅甩角式）。
 *   flingUp    上抛初速：体重决定挑得多高（仅甩角式）。
 *   pinTicks／pinLevel  钉住时长与减速级别：等级决定按住多久（仅深植式）。
 *   shards     命中崩屑量：物攻换算，驱动表现。
 *   aftercast／recharge：速度与等级定收势与循环；甩角式更费。
 *
 * 配置 `rip`（甩角式，默认关）双向取舍：开启＝命中后第二拍补一次 `rip` 伤害并把目标向上向后抛飞，代价是主刺
 * 威力 ×0.9、起手 +3 刻、冷却 +6 刻（把人挑出阵地）；关闭（深植式）＝主刺 ×1.05、把目标钉住（减速 `pinLevel`
 * 级、持续 `pinTicks`），代价是射程 ×0.94、角线更窄、收招 +3 刻（拔角更慢）。两者各有局面：抛人与控场。
 *
 * 伤害段 `gore` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("megahorn", {
        /** 刺入威力：118 + 物攻偏移[−18,50] + 体重偏移[0,26] + 等级偏移[−8,20]；深植 ×1.05 / 甩角 ×0.9；夹 84..196。 */
        gore: formula(
            F.base(118).plus(F.stat("attack").minus(70).times(0.55).clamp(-18, 50))
                .plus(F.body("weight").minus(80).times(0.05).clamp(0, 26))
                .plus(F.level().minus(30).times(0.4).clamp(-8, 20))
                .times(F.when(F.pref("rip", text("worldcombat.skill.megahorn.preference.rip")), F.const(0.9), F.const(1.05)))
                .clamp(84, 196).round(1),
            "刺入威力", {
                unit: "威力",
                description: "角尖扎进目标那一下的基础威力；物攻定角尖、体重给冲量、等级给狠劲。深植式把力全压在这一次刺入上，甩角式分出一点给拔出的第二拍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 角刺射程：3.4 + 身高偏移[−0.35,1.1] ×0.7 + 速度偏移[−0.15,0.35] ×0.004；深植 ×0.94；夹 2.8..4.6。 */
        reach: formula(
            F.base(3.4).plus(F.body("height").minus(1.5).times(0.7).clamp(-0.35, 1.1))
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.35))
                .times(F.when(F.pref("rip", text("worldcombat.skill.megahorn.preference.rip")), F.const(1), F.const(0.94)))
                .clamp(2.8, 4.6).round(2),
            "角刺射程", {
                unit: "格",
                description: "低头冲出的角能扎到多远；身高给角长与步幅，速度给上前的半步。它也是本招的实际射程来源，是全族最长的一条线。"
            }),
        /** 角线半宽：0.36 + 体宽偏移[−0.06,0.22] ×0.16；深植 ×0.9；夹 0.3..0.62。 */
        horn: formula(
            F.base(0.36).plus(F.body("width").minus(0.9).times(0.16).clamp(-0.06, 0.22))
                .times(F.when(F.pref("rip", text("worldcombat.skill.megahorn.preference.rip")), F.const(1), F.const(0.9)))
                .clamp(0.3, 0.62).round(2),
            "角线半宽", {
                unit: "格",
                description: "这条角线的判定半宽；身板越宽角越粗。它很窄，侧身站开就能让这一记落空——画面里那道窄带就是判定范围。"
            }),
        /** 蓄势：15 − 速度偏移[−2,4] ×0.05 + 甩角 +3；夹 9..22。 */
        charge: seconds(
            F.base(15).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4))
                .plus(F.when(F.pref("rip", text("worldcombat.skill.megahorn.preference.rip")), F.const(3), F.const(0)))
                .clamp(9, 22).round(0),
            "蓄势", "低头刨地、把角对准目标的时间；速度越快越短，甩角式多压一拍。这段时间里可以被集火打断，也能被对手走开。"),
        /** 冲身步幅：1.0 + 速度偏移[−0.25,0.6] ×0.008 + 甩角 +0.3；夹 0.5..2.0。 */
        rush: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.25, 0.6))
                .plus(F.when(F.pref("rip", text("worldcombat.skill.megahorn.preference.rip")), F.const(0.3), F.const(0)))
                .clamp(0.5, 2.0).round(2),
            "冲身步幅", {
                unit: "格",
                description: "角送出去时整个人趟出的距离；速度快的个体冲得更前，甩角式为了抛人再多趟一点。"
            }),
        /** 拔出伤害：30 + 物攻偏移[−5,14] ×0.14；夹 18..52（仅甩角式）。 */
        rip: formula(
            F.base(30).plus(F.stat("attack").minus(70).times(0.14).clamp(-5, 14)).clamp(18, 52).round(1),
            "拔出伤害", {
                unit: "威力",
                description: "甩角式第二拍把角从伤口里猛甩出来时补下的一记接触伤害；物攻越高甩得越狠。深植式不使用它。"
            }),
        /** 抛飞距离：1.1 + 施法者体重偏移[0,0.7] − 目标体型抵抗[0,0.4]；夹 0.5..2.0（仅甩角式）。 */
        fling: formula(
            F.base(1.1).plus(F.body("weight").minus(80).times(0.003).clamp(0, 0.7))
                .minus(F.target("actor.height", text("worldcombat.skill.megahorn.value.targetHeight")).minus(1.5).times(0.2).clamp(0, 0.4))
                .clamp(0.5, 2.0).round(2),
            "抛飞距离", {
                unit: "格",
                description: "甩角式把目标沿角的方向甩出去多远；施法者越重甩得越远，目标越高大越站得住。"
            }),
        /** 上抛初速：0.5 + 体重偏移[0,0.3] ×0.0012；夹 0.3..0.9（仅甩角式）。 */
        flingUp: formula(
            F.base(0.5).plus(F.body("weight").minus(80).times(0.0012).clamp(0, 0.3)).clamp(0.3, 0.9).round(2),
            "上抛初速", {
                unit: "格/刻",
                description: "甩角式把目标挑离地面时的向上初速；越重的施法者挑得越高，被挑的人随后按重力落下。"
            }),
        /** 钉住时长：30 + 等级偏移[0,16] ×0.5；夹 24..60（仅深植式）。 */
        pinTicks: seconds(
            F.base(30).plus(F.level().minus(30).times(0.5).clamp(0, 16)).clamp(24, 60).round(0),
            "钉住时长", "深植式把角留在伤口里、目标被按住的时间；等级越高按得越久。"),
        /** 钉住减速级别：固定 1 级；夹 1..3（仅深植式）。 */
        pinLevel: formula(
            F.const(1).clamp(1, 3).round(0),
            "钉住减速", {
                unit: "级",
                description: "深植式钉住目标时施加的减速能力等级（`minecraft:slowness`）；对宝可梦、原版生物与玩家是同一条路径。"
            }),
        /** 崩屑量：16 + 物攻偏移[−4,14] ×0.12；夹 10..40。 */
        shards: formula(
            F.base(16).plus(F.stat("attack").minus(70).times(0.12).clamp(-4, 14)).clamp(10, 40).round(0),
            "崩屑量", {
                unit: "个",
                description: "角尖扎入与拔出时崩出的碎屑数量，由物攻换算；表现按它发射，不是独立伤害。"
            }),
        /** 收招：12 − 速度偏移[−2,3] ×0.03 + 深植 +3 / 甩角 +2；夹 6..20。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("rip", text("worldcombat.skill.megahorn.preference.rip")), F.const(2), F.const(3)))
                .clamp(6, 20).round(0),
            "收招", "扎完后把角收回、重新站稳的时间；深植式要多花一拍拔角。"),
        /** 冷却：40 − 等级偏移[0,7] ×0.2 + 甩角 +6；夹 24..58。 */
        recharge: seconds(
            F.base(40).minus(F.level().minus(30).times(0.2).clamp(0, 7))
                .plus(F.when(F.pref("rip", text("worldcombat.skill.megahorn.preference.rip")), F.const(6), F.const(0)))
                .clamp(24, 58).round(0),
            "冷却", "两次超级角击之间等多久；等级越高回得越快，甩角式额外更费。")
    });

    stages("megahorn", [
        { level: 32, values: { gore: 132 } },
        { level: 52, values: { gore: 148, fling: 1.5 } }
    ]);

    defineDamage("megahorn", "gore", {}, { contact: true });

    describe("megahorn", [
        { key: "description.0", values: ["gore", "reach", "horn"] },
        { key: "rip.on", values: ["rip", "fling", "flingUp"], when: function (context) { return read(context.detail.values, ["rip"]) === true; } },
        { key: "rip.off", values: ["pinTicks", "pinLevel"], when: function (context) { return read(context.detail.values, ["rip"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gore"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gore", "tier.1.fling"] }
    ]);
}
