"""
Fills the part of Pluto's New Horizons map that was never imaged (the southern hemisphere, in polar night
during the 2015 flyby, painted flat brown in the published map) with terrain patches taken from the imaged
mid-latitudes, matched to the map's own colour there. Needs mask.npy from the flat-area detection
(local luminance standard deviation < 1.6 over 9×9 px, opened and closed).
Usage: python3 pluto-fill.py (paths inside).
"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd
rng=np.random.default_rng(7)
im=np.asarray(Image.open('/home/claude/obs/public/textures/dwarf/pluto.jpg')).astype(np.float32)
H,W,_=im.shape
keep=np.load('mask.npy')
lab,n=nd.label(keep); sizes=nd.sum(keep,lab,range(1,n+1))
mask=lab==(1+int(np.argmax(sizes)))
# The opening/closing ate the last rows: extend the mask down to the pole.
ys=np.where(mask.any(1))[0]; mask[ys.max():]=True
# The map team's fill ends in a thin bright seam: take it in as well.
mask=nd.binary_dilation(mask,iterations=18)
src=~nd.binary_dilation(mask,iterations=24)
yy,xx=np.mgrid[0:H,0:W]
src&=(yy>120)&(yy<560)
src&=~((xx>650)&(xx<950)&(yy>180)&(yy<560))
P=128
acc=np.zeros_like(im); wsum=np.zeros((H,W),np.float32)
from scipy.signal.windows import tukey
g=np.outer(tukey(P,0.5),tukey(P,0.5)).astype(np.float32)+1e-3
ymin=np.where(mask.any(1))[0].min()-P
cands=[]
for _ in range(40000):
    sy=rng.integers(0,H-P); sx=rng.integers(0,W-P)
    if src[sy:sy+P,sx:sx+P].all(): cands.append((sy,sx))
    if len(cands)>400: break
print('cands',len(cands))
step=P//2
for y in range(max(0,ymin),H,step):
    for x in range(-P//2,W,step):
        sy,sx=cands[rng.integers(len(cands))]
        patch=im[sy:sy+P,sx:sx+P]
        if rng.random()<0.5: patch=patch[:,::-1]
        y1=min(H,y+P); h=y1-y
        xs_=(np.arange(x,x+P))%W
        acc[y:y1][:,xs_]+=patch[:h]*g[:h,:,None]
        wsum[y:y1][:,xs_]+=g[:h]
fill=acc/np.maximum(wsum,1e-6)[...,None]
# Overlapping patches average out: restore the contrast of a single patch.
fm=nd.gaussian_filter(fill,(6,6,0)); fill=fm+(fill-fm)*1.45
base=nd.gaussian_filter(im,(40,40,0)); fbase=nd.gaussian_filter(fill,(40,40,0))
fill=fill-fbase+(0.75*base+0.25*fbase)
lat=(0.5-(yy+0.5)/H)*np.pi
lon=(xx+0.5)/W*2*np.pi
# Near the pole, equirectangular rows shrink to a point and the patches above pinch into radial streaks.
# Synthesise the cap in a polar (azimuthal) plane instead and project it back.
S=1024
pacc=np.zeros((S,S,3),np.float32); pw=np.zeros((S,S),np.float32)
for y in range(-P//2,S,step):
    for x in range(-P//2,S,step):
        sy,sx=cands[rng.integers(len(cands))]
        patch=im[sy:sy+P,sx:sx+P]
        if rng.random()<0.5: patch=patch[:,::-1]
        y0,x0=max(0,y),max(0,x); y1,x1=min(S,y+P),min(S,x+P)
        pacc[y0:y1,x0:x1]+=patch[y0-y:y1-y,x0-x:x1-x]*g[y0-y:y1-y,x0-x:x1-x,None]
        pw[y0:y1,x0:x1]+=g[y0-y:y1-y,x0-x:x1-x]
plane=pacc/np.maximum(pw,1e-6)[...,None]
pm=nd.gaussian_filter(plane,(6,6,0)); plane=pm+(plane-pm)*1.45
# Cap of 40° radius: plane radius 0.5*S at 40° from the pole; scale so a texel matches the map's mid-latitude size.
rr=np.clip((np.pi/2+lat)/np.radians(40),0,None)*(S*0.48)
u=(S/2+rr*np.cos(lon)); v=(S/2+rr*np.sin(lon))
cap=np.stack([nd.map_coordinates(plane[...,c],[v.ravel(),u.ravel()],order=1,mode='reflect').reshape(H,W) for c in range(3)],-1)
cbase=nd.gaussian_filter(cap,(40,40,0))
cap=cap-cbase+(0.75*base+0.25*cbase)
polar=np.clip((-lat-np.radians(52))/np.radians(10),0,1)[...,None]
fill=fill*(1-polar)+cap*polar
d=nd.distance_transform_edt(mask)
a=np.clip(d/45,0,1)[...,None]
out=np.clip(im*(1-a)+fill*a,0,255).astype(np.uint8)
Image.fromarray(out).save('pluto_filled.jpg',quality=90)
Image.fromarray(out).resize((800,400)).save('pluto_prev.png')
