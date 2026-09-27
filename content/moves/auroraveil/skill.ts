/**
 * 极光幕 / auroraveil 的出手方式与冰雹门槛。
 *
 * 念头的形状：施法者抬头把天光拉下来（windup：头顶卷起极光预告）→ 按落点上方实际能挂多高拉开虹带、铺成一片极光区
 * （curtain）→ 幕下友方身上牵一条细丝连到幕、物理与特殊伤害被一起滤掉（veil / thread / block）→ 天光收拢（fade）。
 * 三幕：起手 → 拉幕 → 幕下受护。
 *
 * 场地高度：提交前用 WorldGeometry.blockHit 从落点向上探真正的原生方块面，确定极光能挂多高。开阔处挂到天顶；
 * 低顶棚贴着真实屋顶、横向虹带随之压短；空间不足 1.6 格时 ready 直接拒绝，不花 PP 也不强撑穿顶。
 * 同一次探得的高度同时写进极光区数据和拉开/持续/收拢的表现，判定与画面用同一份 `ceiling`。
 *
 * 「只有冰雹时才能使出」翻成世界条件：必须是雨/雷暴的天，且施法者脚下不远是雪或冰——即下着雪的冷天。
 * `ready` 在提交前检查这项，天不对就整次不成立、不花 PP；AI 的 available 用同一判据，不会乱铺。
 *
 * 提交前只播预告；极光区在提交后铺。极光区是租借效果（`WorldEffects.field`），到期自己结束。
 */
namespace PokemonSkills {
    export function auroraVeilColdBlock(id: string): boolean {
        return id === "minecraft:snow" || id === "minecraft:snow_block" || id === "minecraft:powder_snow"
            || id === "minecraft:ice" || id === "minecraft:packed_ice" || id === "minecraft:blue_ice"
            || id === "minecraft:frosted_ice";
    }
    /** 冰雹条件：天在下雨或雷暴，且脚下两三格内有雪或冰。 */
    export function auroraVeilHail(world: CombatWorld, point: CombatPoint): boolean {
        const env = WorldEnvironment.read(world, point);
        if (!env || !env.loaded) return false;
        if (!((env.rain || 0) > 0.15 || (env.thunder || 0) > 0.15)) return false;
        const base = Math.floor(point.y());
        for (let dy = 0; dy >= -2; dy--) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const block = world.block(WorldCombat.point(Math.floor(point.x()) + dx + 0.5, base + dy + 0.5, Math.floor(point.z()) + dz + 0.5));
                    if (block !== null && auroraVeilColdBlock(String(block.id()))) return true;
                }
            }
        }
        return false;
    }
    /** 极光能挂的最低高度；再低就真的挂不下一道像样的幕。 */
    export const auroraVeilMinCeiling = 1.6;
    /** 落点向上探一次真正的原生方块（WorldGeometry.blockHit 只看实际 BLOCK，忽略上方活体），
     * 用接触点位置当作可挂高度；开阔处取上限。判定与画面用同一份 `ceiling`，低顶不再强撑穿顶。 */
    export function auroraVeilCeiling(world: CombatWorld, point: CombatPoint): number {
        const maxHeight = 6.5;
        const from = point.plus(WorldCombat.point(0, 0.1, 0));
        const hit = WorldGeometry.blockHit(world, from, point.plus(WorldCombat.point(0, maxHeight, 0)));
        if (hit === null) return maxHeight;
        return Math.max(0, Math.min(maxHeight, hit.position().y() - from.y()));
    }

    const auroraVeilBright = flag("bright", "明幕");
    auroraVeilBright.help = "明幕：物理与特殊减伤各 ×1.2，代价是极光时长 ×0.7、起手 +3 刻、冷却 ×1.15。长幕：减伤为基础值，换来时长 ×1.3、起手 −2 刻、冷却 ×0.95。";

    define({
        id: auroraveilId,
        cooldownParameter: "recharge",
        name: "极光幕",
        description: "在选定位置铺开极光，减少幕下友方受到的物理与特殊伤害。施放时须正在下雨或雷暴，且自己脚下附近有雪或冰。",
        uses: ["同时挡住物理与特殊两路输出", "在雪地的阵地战里护住队伍", "为换人、回复争取一段窗口"],
        kind: "point",
        range: 12,
        maxRange: 18,
        prepare: 12,
        active: 0,
        recover: 7,
        cooldown: 170,
        style: "aurora",
        defaults: { bright: false },
        fields: [auroraVeilBright],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(auroraveilId, "veilRadius", pokemon) : 4, geometry: "area", style: "aurora",
                label: config && config.bright ? "明幕" : "长幕" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[auroraveilId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p(auroraveilId, "tempo", context))),
                recover: Math.max(3, Math.round(p(auroraveilId, "aftercast", context))),
                cooldown: Math.max(70, Math.round(p(auroraveilId, "recharge", context))),
                range: p(auroraveilId, "reach", context),
                active: 0
            };
        },
        ready: function (action, config) {
            const world = action.sense();
            if (!auroraVeilHail(world, action.origin())) return "world_combat:no-hail";
            // 低顶空间不够就真实施放失败、不花 PP，也不强撑着穿顶。
            if (auroraVeilCeiling(world, action.targetPosition()) < auroraVeilMinCeiling) return "world_combat:no-ceiling";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_auroraveil:windup", auroraveilScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(auroraveilId, "veilRadius", action), bright: config && config.bright ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(1.5, p(auroraveilId, "veilRadius", action));
            const ticks = Math.max(120, Math.round(p(auroraveilId, "veilTicks", action)));
            const ribbons = Math.max(2, Math.round(p(auroraveilId, "ribbons", action)));
            const cutPhys = Math.max(0.05, Math.min(0.8, p(auroraveilId, "cutPhys", action)));
            const cutSpec = Math.max(0.05, Math.min(0.8, p(auroraveilId, "cutSpec", action)));
            const ceiling = auroraVeilCeiling(world, point);
            const low = ceiling < 3.2;
            WorldEffects.field(world, auroraveilField, point, radius,
                { cutPhys: cutPhys, cutSpec: cutSpec, radius: radius, ribbons: ribbons, margin: 60,
                    ceiling: ceiling, low: low ? 1 : 0 }, ticks);
            world.sound("cobblemon:move.aurorabeam.actor_1", point, 24, "{}");
            WorldFeedback.emit(world, auroraveilScene, 1, point,
                { moment: "curtain", radius: radius, ribbons: ribbons, ceiling: ceiling, low: low ? 1 : 0, ticks: ticks }, 48);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), auroraveilRaiseText,
                [Math.round(ticks / 20), Math.round(cutPhys * 100), Math.round(cutSpec * 100)], 44);
            done(action);
        }
    });
}
