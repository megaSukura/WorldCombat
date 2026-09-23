/**
 * 招式装配契约（服务端注册入口）。unit.json 的 sources 按所列顺序执行：
 * - parameters.ts 先登记 actionParameters；随后可登记 stages、defineDamage、describe。
 * - skill.ts 调用 define：把已登记的参数接入原生贡献，安装时序和详情入口，注册动作与偏好。
 * - ai.ts 在 define 之后调用 addPreferences，再向 CompanionBehavior 注册本招用途。
 *   registerUse 的 id 与 Skill.id 相同；用途钩子的调用语义见 behavior/world-methods.ts 的 Use。
 * startupSources 在独立的启动域注册物品／MobEffect；clientSources 在客户端注册表现。
 * 额外辅助文件按自己的声明依赖排序。动作执行与提交边界见 NativeRepertoire.Skill；
 * 参数上下文与成长基准见本目录 parameters.ts；表现载荷契约见 mechanisms/world-feedback.ts。
 * - 并行动作由 Skill.composition 声明兼容性和控制资源；NativeLoadout.fork 按独立配招槽启动子动作，
 *   各自支付 PP、读取配置并拥有冷却。NativeLoadout.call 沿用同一动作的提交前内联转交。
 * - 持续过程使用托管效果/WorldBodies 脑；WorldEffects.projectile 以命名处理器接收新的有效作用域。
 *   生命周期与回调契约见 sdk/core/{index,world}.d.ts。
 */
namespace PokemonSkills {
    export type Field = NativeRepertoire.Field;
    export type Skill = NativeRepertoire.Skill;
    export type MenuContext = NativeRepertoire.MenuContext;
    var catalogue = CompanionRepertoire.catalogue;
    export var skills = catalogue.skills, preferences = catalogue.preferences, menus = catalogue.menus, commands = catalogue.commands;
    export var prefKey = catalogue.prefKey;
    export var stateKey = catalogue.stateKey;
    export var field = catalogue.field;
    export var storage = catalogue.storage;
    export var config = catalogue.config;
    export var state = catalogue.state;
    export var setState = catalogue.setState;
    function localizeFields(id: string, fields: Field[]): void {
        fields.forEach(entry => {
            const prefix = "worldcombat.skill." + id + ".preference." + entry.path.join(".");
            if (typeof entry.label === "string") entry.label = { key: prefix, fallback: entry.label };
            if (typeof entry.help === "string" && entry.help) entry.help = { key: prefix + ".help", fallback: entry.help };
            (entry.options || []).forEach(option => { if (typeof option.label === "string") option.label = { key: prefix + "." + String(option.value), fallback: option.label }; });
        });
    }
    export function addPreferences(id: string, defaults: any, fields: Field[]): void {
        var skill = skills[id];
        if (!skill) throw new Error("Define skill before adding preferences: " + id);
        localizeFields(id, fields);
        skill.fields = skill.fields.concat(fields);
        skill.defaults = preferences.extendDefaults(id, defaults);
    }
    export function define(skill: Skill): void {
        localizeFields(skill.id, skill.fields);
        registerTiming(skill);
        const nativeSource = (context: NumberContext) => ({ pokemon: context.pokemon, world: context.world, actor: context.actor,
            state: context.sourceFacts && context.sourceFacts.data.native ? context.sourceFacts.data.native.state : undefined });
        Object.keys(actionParameters.entries(skill.id)).forEach(key => {
            actionParameters.rules.label(skill.id + "/" + key, { key: "worldcombat.skill." + skill.id + ".value." + key });
            NativeRuleValues.bind(actionParameters.rules, skill.id + "/" + key, nativeSource);
        });
        ["prepare", "recover", "cooldown"].forEach(key => NativeRuleValues.bind(timingValues, skill.id + "/" + key, nativeSource));
        if (!skill.resolve) {
            skill.resolve = function (pokemon, values, world, actor, attributes) {
                const context: NumberContext = { pokemon, skill, detail: { values }, world, actor, attributes };
                return { prepare: p(skill.id, "prepare", context), recover: p(skill.id, "recover", context), cooldown: p(skill.id, "cooldown", context), active: skill.active, range: skill.range };
            };
            (<any>skill.resolve).shared = true;
        }
        var inspect = skill.inspect;
        skill.inspect = function (pokemon, detail, context) {
            var output = inspect ? inspect(pokemon, detail, context) : detail;
            if (typeof output.authoredCooldown !== "number") output.authoredCooldown = output.cooldown;
            output.brief = { key: "worldcombat.skill." + skill.id + ".summary" };
            output.description = { paragraphs: [{ key: "worldcombat.skill." + skill.id + ".summary" }], bindings: {} };
            output.uses = skill.uses.map((_, index) => ({ key: "worldcombat.skill." + skill.id + ".use." + index }));
            if (context.full) {
                var facts = { pokemon: pokemon, skill: skill, detail: output, state: context.state, world: context.world, actor: context.actor, attributes: context.attributes };
                output.description = describeSkill(facts);
                output.dependencies = ["world.environment"];
            }
            output.cooldown = cooldownEvaluation({ pokemon, skill, detail: output, world: context.world, actor: context.actor,
                attributes: context.attributes }, output.authoredCooldown).ticks;
            return output;
        };
        catalogue.define(skill);
    }
    /** The shared catalogue installs its native channel once, in CompanionRepertoire. */
    export var installChannel = catalogue.installChannel;
    export function coordinates(point: CombatPoint): {
        x: number;
        y: number;
        z: number;
    } { return { x: point.x(), y: point.y(), z: point.z() }; }
    export function sunlight(world: CombatWorld, point: CombatPoint): number {
        return WorldEnvironment.sunlight(world, point);
    }
}
