/**
 * 疯狂滚压 / steamroller 的参数与伤害段。
 *
 * 原生事实：Bug／物理／威力 65／命中 100／PP 20／接触／30% 畏缩（Cobblemon 1.8，仅 5 位直接学习者）。
 *   原生描述：「旋转揉成团的身体压扁对手。有时会使对手畏缩。」
 *
 * 翻译：把「团成球碾过去」翻成一次**贴地滚过一整排**的动作——把自己揉成一团滚出去，滚到谁身上谁就吃一记
 *   压扁式接触伤害、被推着往前，并按重量压出很高几率的畏缩；滚过之后地面留下一道被压平的短痕（会自己恢复）。
 *   它是本组最便宜、冷却最短的一记，代价是单发最低、只压得到滚过的那条线。
 *
 * 与同族分开：陀螺球（gyroball）在原地转满后**只撞第一个**、威力随速度差放大；疯狂滚压**穿过一整排**、
 *   威力随体重放大、命中即压出畏缩与地面压痕。滚动（rollout）跨出手逐趟变重、铁滚轮（steelroller）吃场地。
 *
 * 数值分散（每个参数各吃不同的精灵数据）：
 *   squash     压扁威力：物攻给压的力、体重给压得有多扁；宽碾式 ×0.94、疾滚式 ×1.08。
 *   lane       滚动距离：速度与体重；宽碾式更短。
 *   rollSpeed  每刻位移：速度；宽碾式更慢。
 *   radius     碾压半宽：碰撞箱宽度与身高；宽碾式 ×1.25——更宽的碾轮能一次压到并排的人。
 *   flinchChance 畏缩几率：体重（越重压得越懵）+ 物攻；宽碾式 ×0.92。
 *   flinchTicks  畏缩持续：等级。
 *   push       推挤距离：体重。
 *   treadCells 压痕块数：体重；宽碾式更长。
 *   treadTicks 压痕停留：等级。
 *   dirt       土屑点数：物攻派生，表现按它发射。
 *   tempo/recover/recharge 速度与等级决定起手、收招与冷却；宽碾式更费。
 *
 * 配置 `wide`（宽碾式，默认关）双向取舍：
 *   开（宽碾）：碾压半宽 ×1.25、推挤 ×1.2、压痕更长，但滚动距离 ×0.9、速度 ×0.88、单发 ×0.94、冷却 +6 刻
 *     ——一次罩住并排的人，滚得更近更慢。
 *   关（疾滚，原生形态）：滚得远、滚得快、单发更重，代价是碾压面窄。
 *
 * 伤害段 `squash` 走共享换算（对手防御、相性与暴击在命中时另算）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const steamrollerId = "steamroller";
    export const steamrollerScene = "world_combat:move_steamroller";
    export const steamrollerFlinchEffect = "world_combat:steamroller_flinch";
    export const steamrollerHitText = "world_combat.move.steamroller.text.hit";
    export const steamrollerMissText = "world_combat.move.steamroller.text.miss";
    export const steamrollerFlinchText = "world_combat.move.steamroller.text.flinch";

    actionParameters.define(steamrollerId, {
        /** 压扁威力：(44 + 物攻偏移[−10,30] + 体重偏移[0,26]) × 宽碾 0.94 / 疾滚 1.08；夹 34..112。 */
        squash: formula(
            F.base(44)
                .plus(F.stat("attack").minus(50).times(0.3).clamp(-10, 30))
                .plus(F.body("weight").minus(60).times(0.06).clamp(0, 26))
                .times(F.when(F.pref("wide"), F.const(0.94), F.const(1.08)))
                .clamp(34, 112).round(1),
            "压扁威力", {
                unit: "威力",
                description: "滚过身上时压下去这一记的威力；物攻给压的力、体重给压得有多扁。疾滚式更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 滚动距离：4.0 + 速度偏移[−0.4,1.0] + 体重偏移[0,0.7]；宽碾 ×0.9；夹 3..7。 */
        lane: formula(
            F.base(4.0).plus(F.stat("speed").minus(50).times(0.02).clamp(-0.4, 1.0))
                .plus(F.body("weight").minus(60).times(0.0035).clamp(0, 0.7))
                .times(F.when(F.pref("wide"), F.const(0.9), F.const(1)))
                .clamp(3, 7).round(2),
            "滚动距离", {
                unit: "格",
                description: "团成球后能滚出多远，也是本招的实际射程来源；腿快、身子重的个体滚得更远，宽碾式滚得近。"
            }),
        /** 每刻位移：0.68 + 速度偏移[−0.1,0.4]；宽碾 ×0.88；夹 0.5..1.15。 */
        rollSpeed: formula(
            F.base(0.68).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.1, 0.4))
                .times(F.when(F.pref("wide"), F.const(0.88), F.const(1)))
                .clamp(0.5, 1.15).round(2),
            "滚动速度", {
                unit: "格/刻",
                description: "球每刻滚过的距离；速度快的个体滚得利落，宽碾式更沉。"
            }),
        /** 碾压半径：0.5 + 宽度偏移[−0.05,0.35] + 身高偏移[−0.04,0.18]；宽碾 ×1.25；夹 0.45..1.15。 */
        radius: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.4).clamp(-0.05, 0.35))
                .plus(F.body("height").minus(1.4).times(0.09).clamp(-0.04, 0.18))
                .times(F.when(F.pref("wide"), F.const(1.25), F.const(1)))
                .clamp(0.45, 1.15).round(2),
            "碾压半径", {
                unit: "格",
                description: "球身两侧各能压到多宽（也是走廊的半宽）；身板越宽压得越宽，宽碾式再宽两成五——并排站的人也会被一起压到。"
            }),
        /** 畏缩几率：0.24 + 体重偏移[0,0.14] + 物攻偏移[0,0.12]；宽碾 ×0.92；夹 0.14..0.5。 */
        flinchChance: percent(
            F.base(0.24).plus(F.body("weight").minus(60).times(0.001).clamp(0, 0.14))
                .plus(F.stat("attack").minus(50).times(0.0012).clamp(0, 0.12))
                .times(F.when(F.pref("wide"), F.const(0.92), F.const(1)))
                .clamp(0.14, 0.5).round(3),
            "畏缩几率", "被压到之后无法开始新动作的几率（原生 30%）；越重压得越懵、物攻越高越容易，宽碾式力道摊薄一点。"),
        /** 畏缩持续：10 + 等级偏移[0,8] 刻；夹 9..20。 */
        flinchTicks: seconds(
            F.base(10).plus(F.level().minus(20).times(0.12).clamp(0, 8)).clamp(9, 20).round(0),
            "畏缩持续", "被压住的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。等级越高压得越久。"),
        /** 推挤距离：0.3 + 体重偏移[0,0.6]；宽碾 ×1.2；夹 0.15..0.9。 */
        push: formula(
            F.base(0.3).plus(F.body("weight").minus(60).times(0.003).clamp(0, 0.6))
                .times(F.when(F.pref("wide"), F.const(1.2), F.const(1)))
                .clamp(0.15, 0.9).round(2),
            "推挤距离", {
                unit: "格",
                description: "被球推着沿滚动方向挪开的距离；越重推得越远，宽碾式推得更开。"
            }),
        /** 压痕块数：10 + 体重偏移[0,14]；宽碾 ×1.4；夹 6..24。 */
        treadCells: formula(
            F.base(10).plus(F.body("weight").minus(60).times(0.12).clamp(0, 14))
                .times(F.when(F.pref("wide"), F.const(1.4), F.const(1)))
                .clamp(6, 24).round(0),
            "压痕块数", {
                unit: "块",
                description: "滚过之后地面被压出多少块平痕；越重压得越长，宽碾式更长。平痕会自己恢复原样。"
            }),
        /** 压痕停留：44 + 等级偏移[0,30] 刻；夹 30..96。 */
        treadTicks: seconds(
            F.base(44).plus(F.level().minus(20).times(0.4).clamp(0, 30)).clamp(30, 96).round(0),
            "压痕停留", "地面上的压痕过多久被收回；等级越高留得越久。"),
        /** 土屑点数：16 + 物攻偏移[−3,16]；夹 10..42。 */
        dirt: formula(
            F.base(16).plus(F.stat("attack").minus(50).times(0.12).clamp(-3, 16)).clamp(10, 42).round(0),
            "土屑点数", {
                unit: "点",
                description: "滚动与压过时迸起的土屑数量，随物攻增长；粒子直接按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：6 − 速度偏移[−0.8,2]；宽碾 +2；夹 3..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 2))
                .plus(F.when(F.pref("wide"), F.const(2), F.const(0)))
                .clamp(3, 10).round(0),
            "起手", "把自己揉成一团的时间；速度越快团得越快，宽碾式多团两刻。"),
        /** 收招：7 − 速度偏移[−0.6,1.5]；夹 4..12。 */
        recover: seconds(
            F.base(7).minus(F.stat("speed").minus(50).times(0.015).clamp(-0.6, 1.5)).clamp(4, 12).round(0),
            "收招", "滚完摊开身体的时间；速度越快收得越快。"),
        /** 冷却：24 − 等级偏移[0,5] + 宽碾 6；夹 14..40。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(20).times(0.15).clamp(0, 5))
                .plus(F.when(F.pref("wide"), F.const(6), F.const(0)))
                .clamp(14, 40).round(0),
            "冷却", "下一趟滚压前的等待；等级高的个体回得更快，宽碾式更费。PP 20 的代价。"),
        minimumMove: hidden(0.05)
    });

    defineDamage(steamrollerId, "squash", {}, { contact: true });

    stages(steamrollerId, [
        { level: 30, values: { squash: 58 } },
        { level: 48, values: { squash: 68, flinchChance: 0.36 } }
    ]);

    describe(steamrollerId, [
        { key: "description.0", values: ["squash","flinchChance","flinchTicks"] },
        { key: "description.1", values: ["lane","rollSpeed","radius","push"] },
        { key: "description.2", values: ["treadCells", "treadTicks"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.squash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.squash", "tier.1.flinchChance"] }
    ]);
}
