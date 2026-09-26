/** 鬼面保留原生的两级降速，时长围绕近身前争取几秒空隙设计。 */
namespace PokemonSkills {
    export const scaryfaceId = "scaryface";
    export const scaryfaceEffect = "world_combat:scary_face_terror";
    export const scaryfaceScene = "world_combat:move_scaryface";
    export const scaryfaceSpot = "world_combat:status/feared";

    actionParameters.define(scaryfaceId, {
        drop: formula(
            F.const(2),
            "速度下降", {
                unit: " 级",
                description: "被吓住期间降低的速度等级。"
            }),
        gazeRange: formula(
            F.body("height").times(2).plus(3).clamp(4, 9),
            "凝视距离", {
                unit: " 格",
                description: "目光能拉住对手的距离；施法者身形越高，脸伸得越远。"
            }),
        fearTicks: seconds(
            F.base(80).plus(F.level().minus(20).max(0).times(0.8)).clamp(80, 140),
            "迟滞时长", "减速与被吓住的状态一起结束；等级提高时略微延长。"),
        recoil: formula(
            F.base(0.5).plus(F.stat("attack").minus(40).max(0).times(0.01)).clamp(0.3, 1.4),
            "退缩距离", {
                unit: " 格",
                description: "命中那一刻把对手逼退多远；施法者物攻越高，气势越足。"
            }),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").times(0.04)).clamp(6, 12),
            "起手", "把脸转过来正对目标需要多久；速度越快越早转脸。"),
        recharge: seconds(
            F.base(180).minus(F.level().minus(30).max(0).times(0.5)).clamp(145, 180),
            "冷却", "两次鬼面之间的等待；等级越高越熟练。")
    });
    describe(scaryfaceId, [
        { key: "description.0", values: ["drop","fearTicks"] },
        { key: "description.1", values: ["gazeRange","recoil"] },
        { key: "reapply", values: [] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "description.blocked", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
