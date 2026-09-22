/**
 * 惊吓 / astonish 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 7）格内。它瞬发、冷却短、单发很轻，
 * 所以 `priority` 把它当「开局或贴身时的一记小打断」：对手贴得很近且还没被吓懵时排前，身处昏暗再加一档
 * （黑暗里威力与畏缩都更强）。
 *
 * `ai.opening`（默认「随时」）实际改变出手条件：选「只潜吓」时，只有在施法者所处的方块光低于 7 才允许出手，
 * 其余时候这一声留到阴影里再用；单独使用时它会等到暗处才叫。
 */
namespace PokemonSkills {
    function astonishWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 7)) return false;
        if (CompanionBehavior.ai<string>(item, "opening", "always") === "dark" && !astonishGloom(context)) return false;
        return true;
    }

    function astonishGloom(context: WorldBehavior.Context): boolean {
        const environment = WorldEnvironment.read(CompanionBehavior.world(context), CompanionBehavior.point(CompanionBehavior.source(context).point));
        const light = Number(environment.blockLight);
        return !isFinite(light) || light < 7;
    }

    CompanionBehavior.registerUse("astonish", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return astonishWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !astonishWants(context, capability, target)) return 0;
            var close = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range;
            var value = close ? 30 : 18;
            if (!CompanionBehavior.status(context, target, "flinch")) value += 6;
            if (astonishGloom(context)) value += 8;
            return value;
        }
    });

    addPreferences("astonish", {}, [
        field(pathOf("lurk"), "潜吓式", "boolean", {
            help: "开启：原地不动、几乎不扑近，但畏缩更久更易、伤得更轻、收招与冷却更长，适合在暗处控住对手。关闭：疾呼，稍稍扑近、出手利落、单发略高。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动尖叫，先走近。尖叫几乎贴脸，太大只会让伙伴白追。"
        }),
        field(pathOf("ai.opening"), "起手时机", "choice", {
            options: [
                { value: "always", label: "随时" },
                { value: "dark", label: "只潜吓（暗处）" }
            ],
            help: "随时：把它当贴身的小打断，随时可用。只潜吓（暗处）：只在施法者所处方块光低于 7 时才叫，黑暗里更凶，但亮处几乎不出手。"
        })
    ]);
}
