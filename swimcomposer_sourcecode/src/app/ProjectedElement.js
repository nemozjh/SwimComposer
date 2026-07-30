


import { mapSpriteToQuad, buildProjectedQuad } from './projectionUtils.js';


export class ProjectedElement {
    
    constructor({ parent, app, width = 200, height = 60, oversample = 2 }) {
        this.app = app;
        this.parent = parent;
        this.baseWidth = width;
        this.baseHeight = height;
        this.oversample = oversample;
        this.content = new PIXI.Container();
        const Sprite2d = PIXI.projection?.Sprite2d || PIXI.Sprite;
        this.sprite = new Sprite2d(PIXI.Texture.EMPTY);
        this.sprite.anchor.set(0.5);
        this.sprite.visible = false;
        parent.addChild(this.sprite);
        const rtW = Math.ceil(width * oversample);
        const rtH = Math.ceil(height * oversample);
        this.renderTexture = PIXI.RenderTexture.create({
            width: rtW,
            height: rtH,
            scaleMode: PIXI.SCALE_MODES.LINEAR
        });
        this.sprite.texture = this.renderTexture;
        this.text = new PIXI.Text('', {
            fontSize: 14,
            fill: 0xffffff,
            fontWeight: '700',
            fontFamily: 'system-ui',
            resolution: Math.max(1, this.app?.renderer?.resolution || 1)
        });
        this.text.anchor.set(0.5);
        this.content.addChild(this.text);

        this.graphics = new PIXI.Graphics();
        this.content.addChild(this.graphics);

        this._visible = false;
    }

    
    renderContent() {
        const w = this.renderTexture.width;
        const h = this.renderTexture.height;
        this.content.position.set(w / 2 / this.oversample, h / 2 / this.oversample);
        this.content.scale.set(this.oversample);

        const matrix = new PIXI.Matrix()
            .scale(this.oversample, this.oversample)
            .translate(w / 2, h / 2);

        this.app.renderer.render(this.content, this.renderTexture, true, matrix);
    }

    
    project(centerX, centerY, projector, scale = 1, rotation = 0) {
        if (typeof projector !== 'function') {
            this.sprite.visible = false;
            return false;
        }

        const halfW = (this.baseWidth * scale) / 2;
        const halfH = (this.baseHeight * scale) / 2;

        const quad = buildProjectedQuad(projector, centerX, centerY, halfW, halfH, rotation);
        if (!quad) {
            this.sprite.visible = false;
            return false;
        }

        const success = mapSpriteToQuad(this.sprite, quad);
        this.sprite.visible = success && this._visible;
        return success;
    }

    
    positionBillboard(screenX, screenY, scale = 1, rotation = 0) {
        if (this.sprite.proj) {
            this.sprite.proj.affine = PIXI.projection?.AFFINE?.NONE ?? 0;
        }
        this.sprite.position.set(screenX, screenY);
        this.sprite.scale.set(scale / this.oversample);
        this.sprite.rotation = rotation;
        this.sprite.visible = this._visible;
    }

    
    set visible(val) {
        this._visible = val;
        this.sprite.visible = val;
    }

    get visible() {
        return this._visible;
    }

    
    set alpha(val) {
        this.sprite.alpha = val;
    }

    get alpha() {
        return this.sprite.alpha;
    }

    
    destroy() {
        this.parent.removeChild(this.sprite);
        this.sprite.destroy({ children: true });
        this.renderTexture.destroy(true);
        this.content.destroy({ children: true });
    }
}

export default ProjectedElement;
