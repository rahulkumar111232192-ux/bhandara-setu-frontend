"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MapPin,
  Loader2,
  UtensilsCrossed,
  ImagePlus,
  UserCircle2,
  CheckCircle2,
  Clock,
  Calendar,
  X,
} from "lucide-react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";


const SubmitMap = dynamic(() => import("@/components/SubmitMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  menu: z.string().optional(),
  category: z.enum([
    "TEMPLE",
    "COMMUNITY",
    "NGO",
    "CORPORATE",
    "PERSONAL",
    "OTHER",
  ]).default("COMMUNITY"),
  timingType: z.enum(["LIVE", "UPCOMING"]).default("LIVE"),
  startTime: z.string().optional(),
  duration: z.enum([
    "LESS_THAN_30_MIN",
    "HALF_TO_ONE_HOUR",
    "ONE_TO_TWO_HOURS",
    "MORE_THAN_TWO_HOURS",
    "UNKNOWN",
  ]).default("UNKNOWN"),
  isOrganizing: z.boolean().default(false),
  organizationName: z.string().optional(),
  address: z.string().optional(),
  organizerName: z.string().optional(),
  organizerBio: z.string().optional(),
  organizerIsVerified: z.boolean().optional(),
  image: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

const CATEGORY_OPTIONS = [
  { value: "COMMUNITY", label: "Community", icon: "🤝" },
  { value: "TEMPLE", label: "Temple / Religious", icon: "🛕" },
  { value: "NGO", label: "NGO / Charity", icon: "💚" },
  { value: "PERSONAL", label: "Personal / Family", icon: "🙏" },
  { value: "CORPORATE", label: "Corporate CSR", icon: "🏢" },
  { value: "OTHER", label: "Other Food Drive", icon: "📍" },
];

export function SubmitForm() {
  const [location, setLocation] = useState({ lat: 28.6139, lng: 77.209 });
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageFileId, setUploadedImageFileId] = useState<string | null>(null);
  const [hasManualAddress, setHasManualAddress] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      menu: "",
      category: "COMMUNITY",
      timingType: "LIVE",
      startTime: "",
      duration: "UNKNOWN",
      isOrganizing: false,
      organizationName: "",
      address: "",
      organizerName: "",
      organizerBio: "",
      organizerIsVerified: false,
      image: undefined,
    },
  });

  const isOrganizing = watch("isOrganizing");
  const timingType = watch("timingType");

  // Load post data if in edit mode
  useEffect(() => {
    if (!editId) return;

    const fetchPostToEdit = async () => {
      try {
        setLoadingEdit(true);
        const res = await apiFetch("/api/users/me/posts");
        const data = await res.json();
        if (data.status === 200 && Array.isArray(data.data)) {
          const post = data.data.find((p: any) => String(p.id) === String(editId));
          if (post) {
            reset({
              title: post.title || "",
              description: post.description || "",
              menu: post.menu || "",
              category: (post.category ? post.category.toUpperCase() : "COMMUNITY") as any,
              timingType: post.isUpcoming || post.status === "upcoming" ? "UPCOMING" : "LIVE",
              startTime: post.startTime ? new Date(post.startTime).toISOString().slice(0, 16) : "",
              duration: post.duration || "UNKNOWN",
              address: post.address || "",
              isOrganizing: Boolean(post.organizer),
              organizerBio: post.organizer?.bio || "",
            });
            if (post.latitude && post.longitude) {
              setLocation({ lat: post.latitude, lng: post.longitude });
              setHasManualAddress(true);
            }
            if (post.imageUrl) {
              setPreviewImage(post.imageUrl);
              setUploadedImageUrl(post.imageUrl);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load post for editing", err);
      } finally {
        setLoadingEdit(false);
      }
    };

    void fetchPostToEdit();
  }, [editId, reset]);

  // Restore saved draft if user was previously redirected to login
  useEffect(() => {
    if (isEditMode) return;
    try {
      const savedDraft = sessionStorage.getItem("bhandara_submit_draft");
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.title) setValue("title", draft.title);
        if (draft.description) setValue("description", draft.description);
        if (draft.menu) setValue("menu", draft.menu);
        if (draft.category) setValue("category", draft.category);
        if (draft.timingType) setValue("timingType", draft.timingType);
        if (draft.startTime) setValue("startTime", draft.startTime);
        if (draft.duration) setValue("duration", draft.duration);
        if (draft.address) {
          setValue("address", draft.address);
          setHasManualAddress(true);
        }
        if (draft.latitude && draft.longitude) {
          setLocation({ lat: draft.latitude, lng: draft.longitude });
        }
        if (draft.imageUrl) {
          setPreviewImage(draft.imageUrl);
          setUploadedImageUrl(draft.imageUrl);
        }
        toast({
          title: "Draft restored",
          description: "Your previous meal details have been restored.",
        });
      }
    } catch {}
  }, [isEditMode, setValue]);

  useEffect(() => {
    if (isEditMode) return; // don't override location in edit mode

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {},
        { maximumAge: 30000, timeout: 5000, enableHighAccuracy: true }
      );
    }
  }, [isEditMode]);


  useEffect(() => {
    if (hasManualAddress) return;

    let isActive = true;

    const getAddressFromCoords = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}`
        );
        const data = await response.json();

        if (isActive && data?.display_name) {
          setValue("address", data.display_name, { shouldDirty: true });
        }
      } catch {
        // ignore
      }
    };

    void getAddressFromCoords();

    return () => {
      isActive = false;
    };
  }, [location.lat, location.lng, hasManualAddress, setValue]);

  const handleUseCurrentLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setHasManualAddress(false);
          toast({
            title: "Location Updated",
            description: "Map centered to your location.",
          });
        },
        () => {
          toast({
            title: "Error",
            description: "Location access denied.",
            variant: "destructive",
          });
        },
        { maximumAge: 30000, timeout: 5000, enableHighAccuracy: true }
      );
    }
  };

  const handleUploadImage = async (file: File) => {
    if (!file) return;

    setUploadingImage(true);
    setPreviewImage(URL.createObjectURL(file));

    try {
      const authResponse = await apiFetch("/api/uploads/auth");
      if (!authResponse.ok) {
        throw new Error("Unable to fetch upload authorization.");
      }

      const authData = await authResponse.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name || `bhandara-${Date.now()}`);
      formData.append("useUniqueFileName", "true");
      formData.append("folder", authData.folder || "/temp");
      formData.append("token", authData.token);
      formData.append("expire", String(authData.expire));
      formData.append("signature", authData.signature);
      formData.append("publicKey", authData.publicKey);

      const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadResult.message || "Image upload failed.");
      }

      const imageUrl = uploadResult.url || uploadResult.thumbnailUrl;
      if (!imageUrl) {
        throw new Error("Image upload did not return a valid url.");
      }

      setUploadedImageUrl(imageUrl);
      setUploadedImageFileId(uploadResult.fileId || null);
      setPreviewImage(imageUrl);
      toast({
        title: "Image ready",
        description: "Your photo has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Something went wrong while uploading the image.",
        variant: "destructive",
      });
      setPreviewImage(null);
      setUploadedImageUrl(null);
      setUploadedImageFileId(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setPreviewImage(null);
    setUploadedImageUrl(null);
    setUploadedImageFileId(null);
  };

  const onSubmit = async (data: FormData) => {
    if (!user || user.isAnonymous) {
      try {
        sessionStorage.setItem(
          "bhandara_submit_draft",
          JSON.stringify({
            ...data,
            latitude: location.lat,
            longitude: location.lng,
            imageUrl: uploadedImageUrl || previewImage || "",
          })
        );
      } catch {}
      toast({
        title: "Sign in required",
        description: "Your meal details are safely saved! Please sign in to publish.",
      });
      router.push("/login?redirect=/submit");
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        title: data.title,
        description: data.description || "",
        category: data.category,
        menu: data.menu || "",
        status: data.timingType === "UPCOMING" ? "UPCOMING" : "LIVE",
        isUpcoming: data.timingType === "UPCOMING",
        startTime: data.timingType === "UPCOMING" && data.startTime ? new Date(data.startTime).toISOString() : null,
        duration: data.duration,
        isOrganizing: Boolean(data.isOrganizing),
        address: data.address || "",
        latitude: location.lat,
        longitude: location.lng,
        organizerBio: data.isOrganizing ? data.organizerBio || "" : "",
        imageUrl: uploadedImageUrl || previewImage || "",
      };

      if (uploadedImageFileId) {
        payload.imageFileId = uploadedImageFileId;
      }

      let res;
      if (isEditMode) {
        res = await apiFetch(`/api/posts/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch("/api/posts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          try {
            sessionStorage.setItem(
              "bhandara_submit_draft",
              JSON.stringify({
                ...data,
                latitude: location.lat,
                longitude: location.lng,
                imageUrl: uploadedImageUrl || previewImage || "",
              })
            );
          } catch {}
          toast({
            title: "Session Expired",
            description: "Your 7-day session expired. Meal details are saved! Please sign in again to publish.",
            variant: "destructive",
          });
          router.push("/login?redirect=/submit");
          return;
        }
        throw new Error(result.message || "Failed to submit");
      }

      // Clear draft on successful submission
      try {
        sessionStorage.removeItem("bhandara_submit_draft");
      } catch {}

      toast({
        title: "Success!",
        description: isEditMode
          ? "Listing has been updated successfully."
          : "Bhandara listing created successfully.",
      });

      router.push(isEditMode ? "/profile" : "/");
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error?.message || "Could not save listing.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading listing details…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg glass-subtle"
        >
          ← Back to Map
        </Link>
        {(!user || user.isAnonymous) && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
            Tip: You&apos;ll be prompted to sign in when submitting
          </span>
        )}
      </div>

      <div className="glass rounded-2xl animate-scale-in">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              {isEditMode ? "Edit Listing" : "Share Free Meal"}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? "Update the details of your bhandara listing."
                : "Let people know where free food is being served right now."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Shiv Mandir Annual Bhandara"
                className="bg-background/50 border-border/50"
                {...register("title")}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Event Category / Type</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("category")}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Timing: Live vs Upcoming */}
            <div className="space-y-3 rounded-2xl border border-border/50 bg-muted/20 p-4">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" /> Event Timing & Status
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <label className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                  timingType === "LIVE" ? "bg-primary/10 border-primary font-medium text-foreground" : "bg-card hover:bg-muted/40"
                )}>
                  <input type="radio" value="LIVE" {...register("timingType")} className="accent-primary" />
                  <span className="text-xs sm:text-sm">🟢 Starting Now (Live)</span>
                </label>
                <label className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                  timingType === "UPCOMING" ? "bg-primary/10 border-primary font-medium text-foreground" : "bg-card hover:bg-muted/40"
                )}>
                  <input type="radio" value="UPCOMING" {...register("timingType")} className="accent-primary" />
                  <span className="text-xs sm:text-sm">🗓️ Scheduled (Upcoming)</span>
                </label>
              </div>

              {timingType === "UPCOMING" && (
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="startTime" className="text-xs text-muted-foreground">
                    Scheduled Start Date & Time
                  </Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    className="bg-background/50 border-border/50 text-sm"
                    {...register("startTime")}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={4}
                className="flex min-h-[120px] w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Describe the event, food items, who it is for, and any important notes"
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu" className="flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-primary" /> What food is being served?
              </Label>
              <Input
                id="menu"
                placeholder="e.g., Khichdi, Halwa-Puri, Langar (Dal-Roti), Chai"
                className="bg-background/50 border-border/50"
                {...register("menu")}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of food items. Helps people know what to expect.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Expected Duration
              </Label>
              <select
                id="duration"
                className="flex h-10 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("duration")}
              >
                <option value="LESS_THAN_30_MIN">Less than 30 minutes</option>
                <option value="HALF_TO_ONE_HOUR">30 minutes to 1 hour</option>
                <option value="ONE_TO_TWO_HOURS">1 to 2 hours</option>
                <option value="MORE_THAN_TWO_HOURS">More than 2 hours (up to 4h)</option>
                <option value="UNKNOWN">I&apos;m not sure / Flexible</option>
              </select>
              <p className="text-xs text-muted-foreground">
                The listing will automatically expire once this duration passes.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Are you organizing this?
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input id="isOrganizing" type="checkbox" className="h-4 w-4" {...register("isOrganizing")} />
                <Label htmlFor="isOrganizing">Yes, I am organizing it</Label>
              </div>
              {isOrganizing && (
                <div className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-background/50 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="organizerBio">Organizer Bio / Details</Label>
                    <Input
                      id="organizerBio"
                      placeholder="e.g. Organized by Shiv Mandir Sewa Samiti"
                      className="bg-background/50 border-border/50"
                      {...register("organizerBio")}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="image">Upload image</Label>
              <label
                htmlFor="image"
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/10 via-background/50 to-muted/50 p-5 text-center shadow-sm transition hover:border-primary/60 hover:bg-primary/10"
              >
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Drop a photo or tap to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, and WEBP are supported</p>
                </div>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleUploadImage(file);
                  }}
                />
              </label>

              {(uploadingImage || previewImage) && (
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/50 shadow-sm">
                  {previewImage ? (
                    <div className="relative">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="h-56 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute right-3 top-3 rounded-full bg-background/80 p-2 text-foreground shadow-sm hover:bg-background"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading image...
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="glass rounded-2xl animate-scale-in">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <MapPin className="h-5 w-5 text-primary" />
              Location
            </CardTitle>
            <CardDescription>
              Tap the map or use your current location and the address will be filled automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  placeholder="Address..."
                  value={watch("address") || ""}
                  onChange={(event) => {
                    setHasManualAddress(true);
                    setValue("address", event.target.value, { shouldDirty: true });
                  }}
                  className="flex-1 bg-background/50 border-border/50"
                />
                <Button type="button" variant="outline" onClick={handleUseCurrentLocation} title="Use current location">
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <SubmitMap location={location} onMapClick={setLocation} />
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Click on the map to set the exact location. Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Button type="submit" className="w-full" disabled={submitting || uploadingImage}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isEditMode ? "Saving changes..." : "Creating post..."}
          </>
        ) : (
          isEditMode ? "Save Changes" : "Share Free Meal"
        )}
      </Button>
    </form>
  );
}

