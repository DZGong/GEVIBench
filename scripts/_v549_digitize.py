#!/usr/bin/env python3
"""Digitize the Voltron549 (yellow) photobleach curve from Fig. 1H by column-scan."""
import numpy as np, json, colorsys
from PIL import Image, ImageDraw
from scipy.optimize import curve_fit

IMG = 'public/photobleach-sources/voltron-fig1h.jpg'
img = Image.open(IMG).convert('RGB')
a = np.array(img).astype(np.float32)/255.0
r,g,b = a[...,0],a[...,1],a[...,2]
maxc=np.max(a,axis=-1); minc=np.min(a,axis=-1)
v=maxc; s=np.where(maxc>0,(maxc-minc)/(maxc+1e-10),0)
delta=maxc-minc+1e-10
rc=(maxc-r)/delta; gc=(maxc-g)/delta; bc=(maxc-b)/delta
h=np.zeros_like(maxc)
h=np.where(maxc==r,bc-gc,h); h=np.where(maxc==g,2.0+rc-bc,h); h=np.where(maxc==b,4.0+gc-rc,h)
h=(h/6.0)%1.0
# yellow mask (Voltron549): hue ~0.15, exclude lime (~0.19)
mask=(h>=0.13)&(h<=0.172)&(s>=0.45)&(v>=0.6)
print('# yellow masked pixels:', int(mask.sum()))

# Calibration
def t_of(px): return (px-65)*600.0/(670-65)
def val_of(py): return -0.055188*py + 31.347  # value=0 @568, 25 @115

H,W = mask.shape
# Restrict to main panel (exclude inset upper-right: inset roughly x>320 & y<410)
cols=[]; rows=[]
for x in range(66, 671):
    ys = np.where(mask[:, x])[0]
    # keep only main-panel rows (below inset region or left of inset)
    ys = ys[(ys>=120)&(ys<=560)]
    # exclude inset area: inset spans approx x in [330,660], y in [150,410]
    if 330 <= x <= 662:
        ys = ys[~((ys>=150)&(ys<=410))]
    if len(ys)==0: continue
    cy = np.median(ys)
    cols.append(x); rows.append(cy)
cols=np.array(cols); rows=np.array(rows)
t=t_of(cols); raw=val_of(rows)
print('# columns digitized:', len(cols), ' t range', round(t.min(),1), round(t.max(),1))
print('# raw value at t0:', round(raw[0],2), ' at end:', round(raw[-1],2))

# Sample at regular ~24 s intervals to match the Voltron525 entry grid
sample_t = list(range(0,601,24))
F0 = raw[:5].mean()  # first-frame value (avg first few columns)
print('# F0 (first-frame value):', round(F0,3))
samp_val=[]; samp_tt=[]
for st in sample_t:
    idx=np.argmin(np.abs(t-st))
    samp_tt.append(round(float(t[idx]),1)); samp_val.append(float(raw[idx]))
samp_val=np.array(samp_val)
# renormalize to own first frame
fnorm = samp_val/samp_val[0]
# enforce monotonic non-increasing (clamp tiny noise)
for i in range(1,len(fnorm)):
    if fnorm[i]>fnorm[i-1]: fnorm[i]=fnorm[i-1]
print('# sampled t:', samp_tt)
print('# F/F0:', [round(x,4) for x in fnorm])
print('# remaining at end: %.3f' % fnorm[-1])

# Biexponential fit
tt=np.array(sample_t,dtype=float)
def biexp(t,a,tau,tau2): return a*np.exp(-t/tau)+(1-a)*np.exp(-t/tau2)
p0=[0.6,150,1500]
popt,_=curve_fit(biexp,tt,fnorm,p0=p0,bounds=([0,1,1],[1,5000,1e5]),maxfev=200000)
af,tau1,tau2=popt
resid=fnorm-biexp(tt,*popt); ss=1-np.sum(resid**2)/np.sum((fnorm-fnorm.mean())**2)
print('# biexp a=%.4f tau1=%.2f tau2=%.2f R2=%.5f'%(af,tau1,tau2,ss))

# model-free t75 / t50 via interpolation on the fitted curve
from scipy.optimize import brentq
def solve(target):
    f=lambda x: biexp(x,*popt)-target
    if f(0)<0: return 0.0
    if f(2000)>0: return None
    return brentq(f,0,2000)
t75=solve(0.75); t50=solve(0.50)
print('# t75=%.1f s  t50=%.1f s'%(t75 if t75 else -1, t50 if t50 else -1))
# also interpolate directly from data
ti75=np.interp(0.75, fnorm[::-1], tt[::-1])
ti50=np.interp(0.50, fnorm[::-1], tt[::-1])
print('# data-interp t75=%.1f  t50=%.1f'%(ti75,ti50))

# Debug overlay
ov=img.convert('RGB').copy(); arr=np.array(ov); arr[mask]=(arr[mask]*0.3+np.array([255,0,0])*0.7).astype(np.uint8)
ov=Image.fromarray(arr); d=ImageDraw.Draw(ov)
for st,fv in zip(sample_t,samp_val):
    px=int(65+st*(670-65)/600.0); py=int((31.347-fv)/0.055188)
    d.ellipse([px-4,py-4,px+4,py+4],outline=(0,0,255),width=2)
ov.save('public/photobleach-sources/_v549_debug.png')
print('# debug saved')

print(json.dumps({'time':[float(x) for x in tt],'fluorescence':[round(float(x),4) for x in fnorm]}))
