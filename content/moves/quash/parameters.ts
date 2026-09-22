/**
 * 延后 / quash 的参数。
 *
 * 原生事实：Dark、变化、威力 0、命中 100、PP 15、单体，命中后把目标的行动顺序压到最后（Cobblemon 1.8）。
 * 翻译：把“行动放到最后”翻成即时战斗里的**抢一拍**——一道暗色压制打下去，目标正在准备的动作被打断，
 * 接下来它第一次想出手的那一下会被压回去（不花资源、只是晚一拍），压制期间它的移动也被拖慢。
 * 数据分散：施压距离随**等级**与**速度**、判定随**碰撞箱高度**、压制时长随**等级**、
 * 被压出的降速级数随**特攻**。配置 crushing（重压取向）用更长的冷却换更久的压制窗口。
 *
 * 公式即最终值，执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    actionParameters.define("quash", {
        /** 施压距离：基础 9 格，30 级起每级 +0.06，速度每比 60 快 1 加 0.02，夹在 7..13。 */
        reach: formula(
            F.base(9).plus(F.level().minus(30).times(0.06))
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-0.6, 0.8))
                .clamp(7, 13).round(1),
            "施压距离", {
                unit: "格",
                description: "压制能够打到的最大距离；等级越高、身法越快越够得着。"
            }),
        /** 判定半径：碰撞箱高度每比 1.4 高 1 格加 0.14，夹在 0.35..0.9。 */
        traceRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.35, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "压制之力的横向判定半径；大个子更容易被罩住。"
            }),
        /** 压制时长：基础 80 刻，30 级起每级 +1；重压 ×1.3 / 轻压 ×0.8；夹在 55..150。 */
        lockTicks: seconds(
            F.base(80).plus(F.level().minus(30).max(0).times(1))
                .times(F.when(F.pref("crushing"), F.const(1.3), F.const(0.8)))
                .clamp(55, 150).round(0),
            "压制时长", "压制在目标身上停留多久；在这段时间里它第一次出手会被压回去。重压取向停得更久。"),
        /** 压下次数：基础 1 次，特攻每比 60 高 60 加 1 次，夹在 1..3 次。 */
        deny: formula(
            F.base(1).plus(F.stat("specialAttack").minus(60).div(60)).clamp(1, 3).round(0),
            "压下次数", {
                unit: "次",
                description: "压制期间最多把目标几次出手压回去；特攻越高越能多压一次。"
            })
    });

    describe("quash", [
        { key: "description.0", values: ["reach", "traceRadius"] },
        { key: "description.1", values: ["lockTicks", "deny"] }
    ]);
}
